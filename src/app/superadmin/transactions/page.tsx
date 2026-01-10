"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, ArrowUp, ArrowDown, RefreshCcw } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const API_URL = API_BASE.endsWith("/api") ? API_BASE : `${API_BASE}/api`;

interface Transaction {
  id: string;
  user_id: string;
  user_email: string;
  transaction_type: string;
  credits_amount: number;
  balance_after: number;
  description?: string;
  created_at: string;
}

const transactionTypes: Record<string, { label: string; positive: boolean }> = {
  credit_added: { label: "Credits Added", positive: true },
  credit_used: { label: "Credits Used", positive: false },
  package_assigned: { label: "Package Assigned", positive: true },
  coupon_applied: { label: "Coupon Applied", positive: true },
  referral_bonus: { label: "Referral Bonus", positive: true },
  refund: { label: "Refund", positive: true },
  expiry: { label: "Credits Expired", positive: false },
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const getToken = () => localStorage.getItem("admin_token");

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/superadmin/transactions?limit=100`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!response.ok) throw new Error("Failed to fetch transactions");
      setTransactions(await response.json());
    } catch (error) { console.error("Error fetching transactions:", error); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch = t.user_email.toLowerCase().includes(searchTerm.toLowerCase()) || (t.description?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = typeFilter === "all" || t.transaction_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const getTypeInfo = (type: string) => transactionTypes[type] || { label: type, positive: false };
  const uniqueTypes = [...new Set(transactions.map((t) => t.transaction_type))];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div></div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-white">Transactions</h1><p className="text-zinc-500 mt-1">{transactions.length} credit transactions</p></div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <input type="text" placeholder="Search by email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-12 pr-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600" />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-600">
          <option value="all">All Types</option>
          {uniqueTypes.map((type) => (<option key={type} value={type}>{getTypeInfo(type).label}</option>))}
        </select>
      </div>

      <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b border-zinc-800">
            <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-6 py-4">User</th>
            <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-6 py-4">Type</th>
            <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-6 py-4">Amount</th>
            <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-6 py-4">Balance</th>
            <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-6 py-4">Date</th>
          </tr></thead>
          <tbody className="divide-y divide-zinc-800">
            {filteredTransactions.map((t) => {
              const typeInfo = getTypeInfo(t.transaction_type);
              return (
                <tr key={t.id} className="hover:bg-zinc-900/50 transition-colors">
                  <td className="px-6 py-4"><p className="text-white">{t.user_email}</p><p className="text-zinc-500 text-sm">{t.description || "-"}</p></td>
                  <td className="px-6 py-4"><span className="px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-white">{typeInfo.label}</span></td>
                  <td className="px-6 py-4"><div className="flex items-center gap-2">
                    {typeInfo.positive ? <ArrowUp className="w-4 h-4 text-white" /> : <ArrowDown className="w-4 h-4 text-zinc-500" />}
                    <span className={typeInfo.positive ? "text-white" : "text-zinc-500"}>{typeInfo.positive ? "+" : "-"}{Math.abs(t.credits_amount)}</span>
                  </div></td>
                  <td className="px-6 py-4"><span className="text-zinc-400">{t.balance_after}</span></td>
                  <td className="px-6 py-4"><span className="text-zinc-500">{new Date(t.created_at).toLocaleString()}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredTransactions.length === 0 && <div className="text-center py-12 text-zinc-500">No transactions found</div>}
      </div>
    </div>
  );
}
