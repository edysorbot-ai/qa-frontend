"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Plug,
  Package,
  DollarSign,
  Tag,
  Link2,
  Activity,
  LogOut,
  Settings,
  CreditCard,
  ChevronRight,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const API_URL = API_BASE.endsWith("/api") ? API_BASE : `${API_BASE}/api`;

const sidebarItems = [
  { name: "Dashboard", href: "/superadmin/dashboard", icon: LayoutDashboard },
  { name: "Users", href: "/superadmin/users", icon: Users },
  { name: "Integrations", href: "/superadmin/integrations", icon: Plug },
  { name: "Packages", href: "/superadmin/packages", icon: Package },
  { name: "Feature Costs", href: "/superadmin/feature-costs", icon: CreditCard },
  { name: "Pricing", href: "/superadmin/pricing", icon: DollarSign },
  { name: "Coupons", href: "/superadmin/coupons", icon: Tag },
  { name: "Referrals", href: "/superadmin/referrals", icon: Link2 },
  { name: "Transactions", href: "/superadmin/transactions", icon: Activity },
];

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [adminUser, setAdminUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    const user = localStorage.getItem("admin_user");
    let isMounted = true;

    if (pathname === "/superadmin" && token) {
      router.push("/superadmin/dashboard");
      return;
    }

    if (pathname !== "/superadmin" && !token) {
      router.push("/superadmin");
      return;
    }

    if (user) {
      try {
        setAdminUser(JSON.parse(user));
      } catch (e) {}
    }

    if (token && pathname !== "/superadmin") {
      fetch(`${API_URL}/superadmin/dashboard`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((res) => {
          if (!res.ok) {
            throw new Error("Invalid token");
          }
          if (isMounted) setLoading(false);
        })
        .catch(() => {
          localStorage.removeItem("admin_token");
          localStorage.removeItem("admin_user");
          router.push("/superadmin");
        });
    } else {
      if (isMounted) setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [pathname, router]);

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
    router.push("/superadmin");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
      </div>
    );
  }

  // Login page - no sidebar
  if (pathname === "/superadmin") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-black flex">
      {/* Sidebar */}
      <aside className="w-64 bg-zinc-950 border-r border-zinc-800 flex flex-col fixed h-full">
        {/* Logo */}
        <div className="p-6 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <Settings className="w-5 h-5 text-black" />
            </div>
            <div>
              <h1 className="text-white font-semibold text-lg">Admin Panel</h1>
              <p className="text-zinc-500 text-xs">Super Admin</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {sidebarItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-white text-black"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.name}</span>
                {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        {/* User & Logout */}
        <div className="p-4 border-t border-zinc-800">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {adminUser?.username?.charAt(0).toUpperCase() || "A"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">
                {adminUser?.username || "Admin"}
              </p>
              <p className="text-zinc-500 text-xs truncate">
                {adminUser?.role || "superadmin"}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 w-full transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
