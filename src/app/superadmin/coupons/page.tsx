"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Edit, Trash2, X, AlertCircle, Copy, Check, Tag } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const API_URL = API_BASE.endsWith("/api") ? API_BASE : `${API_BASE}/api`;

interface Coupon {
  id: string;
  code: string;
  description?: string;
  discount_type: "percentage" | "fixed" | "credits";
  discount_value: number;
  credits_bonus: number;
  max_uses?: number;
  current_uses: number;
  min_purchase_amount: number;
  valid_from: string;
  valid_until?: string;
  is_active: boolean;
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

const defaultForm: { code: string; description: string; discount_type: "percentage" | "fixed" | "credits"; discount_value: number; credits_bonus: number; max_uses: number | undefined; min_purchase_amount: number; valid_from: string; valid_until: string; is_active: boolean } = { code: "", description: "", discount_type: "percentage", discount_value: 10, credits_bonus: 0, max_uses: undefined, min_purchase_amount: 0, valid_from: new Date().toISOString().split("T")[0], valid_until: "", is_active: true };

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const getToken = () => localStorage.getItem("admin_token");

  const fetchCoupons = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/superadmin/coupons`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!response.ok) throw new Error("Failed to fetch coupons");
      setCoupons(await response.json());
    } catch (error) { console.error("Error fetching coupons:", error); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCoupons(); }, [fetchCoupons]);

  const generateCode = () => { const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"; let code = ""; for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length)); return code; };
  const copyCode = (code: string, id: string) => { navigator.clipboard.writeText(code); setCopiedId(id); setTimeout(() => setCopiedId(null), 2000); };

  const openCreateModal = () => { setIsEditing(false); setSelectedCoupon(null); setForm({ ...defaultForm, code: generateCode() }); setError(""); setShowModal(true); };
  const openEditModal = (coupon: Coupon) => {
    setIsEditing(true); setSelectedCoupon(coupon);
    setForm({ code: coupon.code, description: coupon.description || "", discount_type: coupon.discount_type, discount_value: coupon.discount_value, credits_bonus: coupon.credits_bonus, max_uses: coupon.max_uses, min_purchase_amount: coupon.min_purchase_amount, valid_from: coupon.valid_from.split("T")[0], valid_until: coupon.valid_until?.split("T")[0] || "", is_active: coupon.is_active });
    setError(""); setShowModal(true);
  };

  const handleSubmit = async () => {
    setActionLoading(true); setError("");
    try {
      const url = isEditing ? `${API_URL}/superadmin/coupons/${selectedCoupon?.id}` : `${API_URL}/superadmin/coupons`;
      const response = await fetch(url, { method: isEditing ? "PATCH" : "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` }, body: JSON.stringify(form) });
      if (!response.ok) throw new Error("Failed to save coupon");
      setShowModal(false); fetchCoupons();
    } catch (err: any) { setError(err.message); } finally { setActionLoading(false); }
  };

  const handleDelete = async () => {
    if (!selectedCoupon) return;
    setActionLoading(true); setError("");
    try {
      const response = await fetch(`${API_URL}/superadmin/coupons/${selectedCoupon.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${getToken()}` } });
      if (!response.ok) throw new Error("Failed to delete coupon");
      setShowDeleteModal(false); fetchCoupons();
    } catch (err: any) { setError(err.message); } finally { setActionLoading(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white">Coupons</h1><p className="text-zinc-500 mt-1">{coupons.length} coupons</p></div>
        <button onClick={openCreateModal} className="flex items-center gap-2 px-4 py-2.5 bg-white text-black rounded-lg font-medium hover:bg-zinc-200 transition-colors"><Plus className="w-4 h-4" /> New Coupon</button>
      </div>

      <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b border-zinc-800">
            <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-6 py-4">Code</th>
            <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-6 py-4">Discount</th>
            <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-6 py-4">Uses</th>
            <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-6 py-4">Valid Until</th>
            <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-6 py-4">Status</th>
            <th className="text-right text-xs font-medium text-zinc-500 uppercase tracking-wider px-6 py-4">Actions</th>
          </tr></thead>
          <tbody className="divide-y divide-zinc-800">
            {coupons.map((coupon) => (
              <tr key={coupon.id} className="hover:bg-zinc-900/50 transition-colors">
                <td className="px-6 py-4"><div className="flex items-center gap-3"><Tag className="w-4 h-4 text-zinc-500" /><div><code className="text-white font-mono">{coupon.code}</code><p className="text-zinc-500 text-sm">{coupon.description || "-"}</p></div></div></td>
                <td className="px-6 py-4"><span className="text-white">{coupon.discount_type === "percentage" ? `${coupon.discount_value}%` : coupon.discount_type === "credits" ? `${coupon.credits_bonus} credits` : `$${coupon.discount_value}`}</span></td>
                <td className="px-6 py-4"><span className="text-zinc-400">{coupon.current_uses}{coupon.max_uses ? `/${coupon.max_uses}` : ""}</span></td>
                <td className="px-6 py-4"><span className="text-zinc-500">{coupon.valid_until ? new Date(coupon.valid_until).toLocaleDateString() : "No expiry"}</span></td>
                <td className="px-6 py-4"><span className={`px-3 py-1 rounded-full text-xs font-medium ${coupon.is_active ? "bg-white/10 text-white" : "bg-zinc-800 text-zinc-500"}`}>{coupon.is_active ? "Active" : "Inactive"}</span></td>
                <td className="px-6 py-4"><div className="flex items-center justify-end gap-1">
                  <button onClick={() => copyCode(coupon.code, coupon.id)} className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">{copiedId === coupon.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}</button>
                  <button onClick={() => openEditModal(coupon)} className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => { setSelectedCoupon(coupon); setError(""); setShowDeleteModal(true); }} className="p-2 text-zinc-500 hover:text-red-500 hover:bg-zinc-800 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
        {coupons.length === 0 && <div className="text-center py-12 text-zinc-500">No coupons found</div>}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={isEditing ? "Edit Coupon" : "New Coupon"}>
        {error && <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4 flex items-center gap-2 text-red-400 text-sm"><AlertCircle className="w-4 h-4" /> {error}</div>}
        <div className="space-y-4">
          <div><label className="block text-sm text-zinc-400 mb-2">Code</label><input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-zinc-600" /></div>
          <div><label className="block text-sm text-zinc-400 mb-2">Description</label><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-600" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm text-zinc-400 mb-2">Discount Type</label><select value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value as any })} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-600"><option value="percentage">Percentage</option><option value="fixed">Fixed Amount</option><option value="credits">Bonus Credits</option></select></div>
            <div><label className="block text-sm text-zinc-400 mb-2">{form.discount_type === "credits" ? "Bonus Credits" : "Discount Value"}</label><input type="number" value={form.discount_type === "credits" ? form.credits_bonus : form.discount_value} onChange={(e) => setForm({ ...form, [form.discount_type === "credits" ? "credits_bonus" : "discount_value"]: parseInt(e.target.value) })} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-600" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm text-zinc-400 mb-2">Max Uses</label><input type="number" value={form.max_uses || ""} onChange={(e) => setForm({ ...form, max_uses: e.target.value ? parseInt(e.target.value) : undefined })} placeholder="Unlimited" className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-600" /></div>
            <div><label className="block text-sm text-zinc-400 mb-2">Valid Until</label><input type="date" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-600" /></div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-white" /><span className="text-zinc-400 text-sm">Active</span></label>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-3 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={actionLoading || !form.code} className="flex-1 px-4 py-3 bg-white text-black rounded-lg font-medium hover:bg-zinc-200 disabled:opacity-50 transition-colors">{actionLoading ? "Saving..." : "Save"}</button>
        </div>
      </Modal>

      <Modal open={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Coupon">
        <p className="text-zinc-400 mb-6">Are you sure you want to delete <code className="text-white">{selectedCoupon?.code}</code>? This action cannot be undone.</p>
        {error && <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4 flex items-center gap-2 text-red-400 text-sm"><AlertCircle className="w-4 h-4" /> {error}</div>}
        <div className="flex gap-3">
          <button onClick={() => setShowDeleteModal(false)} className="flex-1 px-4 py-3 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors">Cancel</button>
          <button onClick={handleDelete} disabled={actionLoading} className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 transition-colors">{actionLoading ? "Deleting..." : "Delete"}</button>
        </div>
      </Modal>
    </div>
  );
}
