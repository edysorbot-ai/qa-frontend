"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users,
  CreditCard,
  TestTube,
  Bot,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const API_URL = API_BASE.endsWith("/api") ? API_BASE : `${API_BASE}/api`;

interface DashboardStats {
  total_users: number;
  new_users_30d: number;
  total_credits_in_system: number;
  total_credits_consumed: number;
  total_test_runs: number;
  total_test_cases: number;
  total_agents: number;
  active_schedules: number;
}

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const token = localStorage.getItem("admin_token");
      const response = await fetch(`${API_URL}/superadmin/dashboard`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch stats");
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Users",
      value: stats?.total_users || 0,
      change: `+${stats?.new_users_30d || 0}`,
      changeLabel: "last 30 days",
      trend: "up",
      icon: Users,
    },
    {
      title: "Credits Available",
      value: Number(stats?.total_credits_in_system || 0).toLocaleString(),
      change: Number(stats?.total_credits_consumed || 0).toLocaleString(),
      changeLabel: "consumed",
      trend: "neutral",
      icon: CreditCard,
    },
    {
      title: "Test Runs",
      value: stats?.total_test_runs || 0,
      change: stats?.total_test_cases || 0,
      changeLabel: "test cases",
      trend: "up",
      icon: TestTube,
    },
    {
      title: "Active Agents",
      value: stats?.total_agents || 0,
      change: stats?.active_schedules || 0,
      changeLabel: "active schedules",
      trend: "neutral",
      icon: Bot,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-zinc-500 mt-1">Overview of your platform statistics</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => (
          <div
            key={card.title}
            className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-3">
                <p className="text-sm text-zinc-500">{card.title}</p>
                <p className="text-3xl font-bold text-white">{card.value}</p>
                <div className="flex items-center gap-2">
                  {card.trend === "up" ? (
                    <span className="flex items-center text-xs text-emerald-500">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      {card.change}
                    </span>
                  ) : card.trend === "down" ? (
                    <span className="flex items-center text-xs text-red-500">
                      <TrendingDown className="w-3 h-3 mr-1" />
                      {card.change}
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-500">{card.change}</span>
                  )}
                  <span className="text-xs text-zinc-600">{card.changeLabel}</span>
                </div>
              </div>
              <div className="w-10 h-10 bg-zinc-900 rounded-lg flex items-center justify-center">
                <card.icon className="w-5 h-5 text-zinc-400" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Stats */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Platform Overview</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-zinc-800">
              <span className="text-zinc-400">Total Test Cases</span>
              <span className="text-white font-medium">{stats?.total_test_cases || 0}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-zinc-800">
              <span className="text-zinc-400">Total Test Runs</span>
              <span className="text-white font-medium">{stats?.total_test_runs || 0}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-zinc-800">
              <span className="text-zinc-400">Active Schedules</span>
              <span className="text-white font-medium">{stats?.active_schedules || 0}</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-zinc-400">Credits Consumed</span>
              <span className="text-white font-medium">
                {Number(stats?.total_credits_consumed || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Manage Users", href: "/superadmin/users" },
              { label: "View Integrations", href: "/superadmin/integrations" },
              { label: "Credit Packages", href: "/superadmin/packages" },
              { label: "View Transactions", href: "/superadmin/transactions" },
            ].map((action) => (
              <a
                key={action.href}
                href={action.href}
                className="flex items-center justify-between p-4 bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors group"
              >
                <span className="text-sm text-zinc-300">{action.label}</span>
                <ArrowUpRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
