"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Edit, Trash2, X, AlertCircle, Copy, Check, Link2, Users } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const API_URL = API_BASE.endsWith("/api") ? API_BASE : `${API_BASE}/api`;
const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000";

interface ReferralLink {
  id: string;
  code: string;
  description?: string;
  referrer_credits: number;
  referee_credits: number;
  referrer_discount_percent: number;
  referee_discount_percent: number;
  max_referrals?: number;
  current_referrals: number;
  is_active: boolean;
  valid_until?: string;
}

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative bg-zinc-950 border border-zinc-800 rounded-xl w-full max-w-md p-6 m-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

const defaultForm = { code: "", description: "", referrer_credits: 50, referee_credits: 50, referrer_discount_percent: 10, referee_discount_percent: 10, max_referrals: undefined as number | undefined, is_active: true, valid_until: "" };

export default function ReferralsPage() {
  const [referrals, setReferrals] = useState<ReferralLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedReferral, setSelectedReferral] = useState<ReferralLink | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const getToken = () => localStorage.getItem("admin_token");

  const fetchReferrals = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/superadmin/referrals`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!response.ok) throw new Error("Failed to fetch referrals");
      setReferrals(await response.json());
    } catch (error) { console.error("Error fetching referrals:", error); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchReferrals(); }, [fetchReferrals]);

  const generateCode = () => { const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"; let code = "REF"; for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length)); return code; };
  const copyLink = (code: string, id: string) => { navigator.clipboard.writeText(`${FRONTEND_URL}?ref=${code}`); setCopiedId(id); setTimeout(() => setCopiedId(null), 2000); };

  const openCreateModal = () => { setIsEditing(false); setSelectedReferral(null); setForm({ ...defaultForm, code: generateCode() }); setError(""); setShowModal(true); };
  const openEditModal = (referral: ReferralLink) => {
    setIsEditing(true); setSelectedReferral(referral);
    setForm({ code: referral.code, description: referral.description || "", referrer_credits: referral.referrer_credits, referee_credits: referral.referee_credits, referrer_discount_percent: referral.referrer_discount_percent, referee_discount_percent: referral.referee_discount_percent, max_referrals: referral.max_referrals, is_active: referral.is_active, valid_until: referral.valid_until?.split("T")[0] || "" });
    setError(""); setShowModal(true);
  };

  const handleSubmit = async () => {
    setActionLoading(true); setError("");
    try {
      const url = isEditing ? `${API_URL}/superadmin/referrals/${selectedReferral?.id}` : `${API_URL}/superadmin/referrals`;
      const response = await fetch(url, { method: isEditing ? "PATCH" : "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` }, body: JSON.stringify(form) });
      if (!response.ok) throw new Error("Failed to save referral");
      setShowModal(false); fetchReferrals();
    } catch (err: any) { setError(err.message); } finally { setActionLoading(false); }
  };

  const handleDelete = async () => {
    if (!selectedReferral) return;
    setActionLoading(true); setError("");
    try {
      const response = await fetch(`${API_URL}/superadmin/referrals/${selectedReferral.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${getToken()}` } });
      if (!response.ok) throw new Error("Failed to delete referral");
      setShowDeleteModal(false); fetchReferrals();
    } catch (err: any) { setError(err.message); } finally { setActionLoading(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white">Referral Links</h1><p className="text-zinc-500 mt-1">{referrals.length} referral links</p></div>
        <button onClick={openCreateModal} className="flex items-center gap-2 px-4 py-2.5 bg-white text-black rounded-lg font-medium hover:bg-zinc-200 transition-colors"><Plus className="w-4 h-4" /> New Referral</button>
      </div>

      <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b border-zinc-800">
            <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-6 py-4">Code</th>
            <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-6 py-4">Rewards</th>
            <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-6 py-4">Referrals</th>
            <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-6 py-4">Status</th>
            <th className="text-right text-xs font-medium text-zinc-500 uppercase tracking-wider px-6 py-4">Actions</th>
          </tr></thead>
          <tbody className="divide-y divide-zinc-800">
            {referrals.map((referral) => (
              <tr key={referral.id} className="hover:bg-zinc-900/50 transition-colors">
                <td className="px-6 py-4"><div className="flex items-center gap-3"><Link2 className="w-4 h-4 text-zinc-500" /><div><code className="text-white font-mono">{referral.code}</code><p className="text-zinc-500 text-sm">{referral.description || "-"}</p></div></div></td>
                <td className="px-6 py-4"><div className="space-y-1"><p className="text-white text-sm">Referrer: {referral.referrer_credits} credits</p><p className="text-zinc-500 text-sm">Referee: {referral.referee_credits} credits</p></div></td>
                <td className="px-6 py-4"><div className="flex items-center gap-2"><Users className="w-4 h-4 text-zinc-500" /><span className="text-zinc-400">{referral.current_referrals}{referral.max_referrals ? `/${referral.max_referrals}` : ""}</span></div></td>
                <td className="px-6 py-4"><span className={`px-3 py-1 rounded-full text-xs font-medium ${referral.is_active ? "bg-white/10 text-white" : "bg-zinc-800 text-zinc-500"}`}>{referral.is_active ? "Active" : "Inactive"}</span></td>
                <td className="px-6 py-4"><div className="flex items-center justify-end gap-1">
                  <button onClick={() => copyLink(referral.code, referral.id)} className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">{copiedId === referral.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}</button>
                  <button onClick={() => openEditModal(referral)} className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => { setSelectedReferral(referral); setError(""); setShowDeleteModal(true); }} className="p-2 text-zinc-500 hover:text-red-500 hover:bg-zinc-800 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
        {referrals.length === 0 && <div className="text-center py-12 text-zinc-500">No referrals found</div>}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={isEditing ? "Edit Referral" : "New Referral"}>
        {error && <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4 flex items-center gap-2 text-red-400 text-sm"><AlertCircle className="w-4 h-4" /> {error}</div>}
        <div className="space-y-4">
          <div><label className="block text-sm text-zinc-400 mb-2">Code</label><input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-zinc-600" /></div>
          <div><label className="block text-sm text-zinc-400 mb-2">Description</label><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-600" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm text-zinc-400 mb-2">Referrer Credits</label><input type="number" value={form.referrer_credits} onChange={(e) => setForm({ ...form, referrer_credits: parseInt(e.target.value) })} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-600" /></div>
            <div><label className="block text-sm text-zinc-400 mb-2">Referee Credits</label><input type="number" value={form.referee_credits} onChange={(e) => setForm({ ...form, referee_credits: parseInt(e.target.value) })} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-600" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm text-zinc-400 mb-2">Max Referrals</label><input type="number" value={form.max_referrals || ""} onChange={(e) => setForm({ ...form, max_referrals: e.target.value ? parseInt(e.target.value) : undefined })} placeholder="Unlimited" className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-600" /></div>
            <div><label className="block text-sm text-zinc-400 mb-2">Valid Until</label><input type="date" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-600" /></div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-white" /><span className="text-zinc-400 text-sm">Active</span></label>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-3 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={actionLoading || !form.code} className="flex-1 px-4 py-3 bg-white text-black rounded-lg font-medium hover:bg-zinc-200 disabled:opacity-50 transition-colors">{actionLoading ? "Saving..." : "Save"}</button>
        </div>
      </Modal>

      <Modal open={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Referral">
        <p className="text-zinc-400 mb-6">Are you sure you want to delete <code className="text-white">{selectedReferral?.code}</code>? This action cannot be undone.</p>
        {error && <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4 flex items-center gap-2 text-red-400 text-sm"><AlertCircle className="w-4 h-4" /> {error}</div>}
        <div className="flex gap-3">
          <button onClick={() => setShowDeleteModal(false)} className="flex-1 px-4 py-3 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors">Cancel</button>
          <button onClick={handleDelete} disabled={actionLoading} className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 transition-colors">{actionLoading ? "Deleting..." : "Delete"}</button>
        </div>
      </Modal>
    </div>
  );
}
