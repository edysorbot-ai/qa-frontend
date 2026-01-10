"use client";

import { useEffect, useState, useCallback } from "react";
import { CreditCard, AlertCircle, Check } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const API_URL = API_BASE.endsWith("/api") ? API_BASE : `${API_BASE}/api`;

interface CreditPricing {
  id: string;
  credits_per_dollar: number;
  min_purchase_credits: number;
}

export default function PricingPage() {
  const [pricing, setPricing] = useState<CreditPricing | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [creditsPerDollar, setCreditsPerDollar] = useState(10);
  const [minPurchase, setMinPurchase] = useState(100);

  const getToken = () => localStorage.getItem("admin_token");

  const fetchPricing = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/superadmin/pricing`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!response.ok) throw new Error("Failed to fetch pricing");
      const data = await response.json();
      setPricing(data);
      if (data) { setCreditsPerDollar(data.credits_per_dollar); setMinPurchase(data.min_purchase_credits); }
    } catch (error) { console.error("Error fetching pricing:", error); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPricing(); }, [fetchPricing]);

  const handleSave = async () => {
    setSaving(true); setError(""); setSuccess("");
    try {
      const response = await fetch(`${API_URL}/superadmin/pricing`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ credits_per_dollar: creditsPerDollar, min_purchase_credits: minPurchase }),
      });
      if (!response.ok) throw new Error("Failed to update pricing");
      setSuccess("Pricing updated successfully!"); setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div></div>;

  const pricePerCredit = creditsPerDollar > 0 ? (1 / creditsPerDollar).toFixed(4) : "0";

  return (
    <div className="space-y-6 max-w-2xl">
      <div><h1 className="text-2xl font-bold text-white">Credit Pricing</h1><p className="text-zinc-500 mt-1">Configure credit to dollar conversion</p></div>

      {error && <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center gap-2 text-red-400 text-sm"><AlertCircle className="w-4 h-4" /> {error}</div>}
      {success && <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-center gap-2 text-green-400 text-sm"><Check className="w-4 h-4" /> {success}</div>}

      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-6"><CreditCard className="w-5 h-5 text-zinc-500" /><h2 className="text-white font-medium">Pricing Configuration</h2></div>
        <div className="space-y-6">
          <div><label className="block text-sm text-zinc-400 mb-2">Credits per Dollar</label><input type="number" min="1" value={creditsPerDollar} onChange={(e) => setCreditsPerDollar(parseInt(e.target.value))} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-600" /><p className="text-xs text-zinc-500 mt-2">Users receive {creditsPerDollar} credits for every $1 spent</p></div>
          <div><label className="block text-sm text-zinc-400 mb-2">Minimum Purchase (Credits)</label><input type="number" min="1" value={minPurchase} onChange={(e) => setMinPurchase(parseInt(e.target.value))} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-600" /><p className="text-xs text-zinc-500 mt-2">Minimum credit purchase amount</p></div>
        </div>
      </div>

      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-white font-medium mb-4">Price Summary</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-zinc-900 rounded-lg p-4"><p className="text-zinc-500 text-sm">Price per Credit</p><p className="text-2xl font-bold text-white">${pricePerCredit}</p></div>
          <div className="bg-zinc-900 rounded-lg p-4"><p className="text-zinc-500 text-sm">Min. Purchase</p><p className="text-2xl font-bold text-white">${(minPurchase / creditsPerDollar).toFixed(2)}</p></div>
        </div>
      </div>

      <button onClick={handleSave} disabled={saving} className="w-full px-4 py-3 bg-white text-black rounded-lg font-medium hover:bg-zinc-200 disabled:opacity-50 transition-colors">{saving ? "Saving..." : "Save Changes"}</button>
    </div>
  );
}
