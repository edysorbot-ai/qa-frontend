"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Search,
  Edit,
  Trash2,
  CreditCard,
  Package,
  X,
  AlertCircle,
  MoreVertical,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const API_URL = API_BASE.endsWith("/api") ? API_BASE : `${API_BASE}/api`;

interface User {
  id: string;
  clerk_id: string;
  email: string;
  name?: string;
  created_at: string;
  current_credits: number;
  total_credits_used: number;
  package_name?: string;
  package_id?: string;
}

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  is_unlimited: boolean;
}

// Modal Component
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

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [creditsToAdd, setCreditsToAdd] = useState("");
  const [creditDescription, setCreditDescription] = useState("");
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const getToken = () => localStorage.getItem("admin_token");

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/superadmin/users`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!response.ok) throw new Error("Failed to fetch users");
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPackages = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/superadmin/packages`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!response.ok) throw new Error("Failed to fetch packages");
      const data = await response.json();
      setPackages(data);
    } catch (error) {
      console.error("Error fetching packages:", error);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchPackages();
  }, [fetchUsers, fetchPackages]);

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/superadmin/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ name: editName, email: editEmail }),
      });
      if (!response.ok) throw new Error("Failed to update user");
      setShowEditModal(false);
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddCredits = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/superadmin/users/${selectedUser.id}/credits`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ credits: parseInt(creditsToAdd), description: creditDescription || "Credits added by admin" }),
      });
      if (!response.ok) throw new Error("Failed to add credits");
      setShowCreditsModal(false);
      setCreditsToAdd("");
      setCreditDescription("");
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignPackage = async () => {
    if (!selectedUser || !selectedPackageId) return;
    setActionLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/superadmin/users/${selectedUser.id}/package`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ packageId: selectedPackageId }),
      });
      if (!response.ok) throw new Error("Failed to assign package");
      setShowPackageModal(false);
      setSelectedPackageId("");
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/superadmin/users/${selectedUser.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!response.ok) throw new Error("Failed to delete user");
      setShowDeleteModal(false);
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-zinc-500 mt-1">{users.length} total users</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
        <input
          type="text"
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-12 pr-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
        />
      </div>

      {/* Users Table */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-6 py-4">User</th>
              <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-6 py-4">Package</th>
              <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-6 py-4">Credits</th>
              <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-6 py-4">Used</th>
              <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-6 py-4">Joined</th>
              <th className="text-right text-xs font-medium text-zinc-500 uppercase tracking-wider px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-zinc-900/50 transition-colors">
                <td className="px-6 py-4">
                  <div>
                    <p className="text-white font-medium">{user.email}</p>
                    <p className="text-zinc-500 text-sm">{user.name || "No name"}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    user.package_name
                      ? "bg-white/10 text-white"
                      : "bg-zinc-800 text-zinc-500"
                  }`}>
                    {user.package_name || "No Package"}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-white font-medium">{user.current_credits.toLocaleString()}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-zinc-400">{user.total_credits_used.toLocaleString()}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-zinc-500">{new Date(user.created_at).toLocaleDateString()}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => { setSelectedUser(user); setCreditsToAdd(""); setCreditDescription(""); setError(""); setShowCreditsModal(true); }}
                      className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                      title="Add Credits"
                    >
                      <CreditCard className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => { setSelectedUser(user); setSelectedPackageId(user.package_id || ""); setError(""); setShowPackageModal(true); }}
                      className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                      title="Assign Package"
                    >
                      <Package className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => { setSelectedUser(user); setEditName(user.name || ""); setEditEmail(user.email); setError(""); setShowEditModal(true); }}
                      className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => { setSelectedUser(user); setError(""); setShowDeleteModal(true); }}
                      className="p-2 text-zinc-500 hover:text-red-500 hover:bg-zinc-800 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredUsers.length === 0 && (
          <div className="text-center py-12 text-zinc-500">No users found</div>
        )}
      </div>

      {/* Edit Modal */}
      <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="Edit User">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4 flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Name</label>
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-600"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Email</label>
            <input
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-600"
            />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={() => setShowEditModal(false)} className="flex-1 px-4 py-3 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors">
            Cancel
          </button>
          <button onClick={handleUpdateUser} disabled={actionLoading} className="flex-1 px-4 py-3 bg-white text-black rounded-lg font-medium hover:bg-zinc-200 disabled:opacity-50 transition-colors">
            {actionLoading ? "Saving..." : "Save"}
          </button>
        </div>
      </Modal>

      {/* Add Credits Modal */}
      <Modal open={showCreditsModal} onClose={() => setShowCreditsModal(false)} title="Add Credits">
        <p className="text-zinc-500 text-sm mb-4">Add credits to {selectedUser?.email}</p>
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4 flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Credits</label>
            <input
              type="number"
              min="1"
              value={creditsToAdd}
              onChange={(e) => setCreditsToAdd(e.target.value)}
              placeholder="100"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-600"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Description (optional)</label>
            <input
              value={creditDescription}
              onChange={(e) => setCreditDescription(e.target.value)}
              placeholder="Bonus credits"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-600"
            />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={() => setShowCreditsModal(false)} className="flex-1 px-4 py-3 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors">
            Cancel
          </button>
          <button onClick={handleAddCredits} disabled={actionLoading || !creditsToAdd} className="flex-1 px-4 py-3 bg-white text-black rounded-lg font-medium hover:bg-zinc-200 disabled:opacity-50 transition-colors">
            {actionLoading ? "Adding..." : "Add Credits"}
          </button>
        </div>
      </Modal>

      {/* Assign Package Modal */}
      <Modal open={showPackageModal} onClose={() => setShowPackageModal(false)} title="Assign Package">
        <p className="text-zinc-500 text-sm mb-4">Assign a package to {selectedUser?.email}</p>
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4 flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}
        <div>
          <label className="block text-sm text-zinc-400 mb-2">Package</label>
          <select
            value={selectedPackageId}
            onChange={(e) => setSelectedPackageId(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-600"
          >
            <option value="">Select a package</option>
            {packages.map((pkg) => (
              <option key={pkg.id} value={pkg.id}>
                {pkg.name} - {pkg.is_unlimited ? "Unlimited" : `${pkg.credits} credits`}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={() => setShowPackageModal(false)} className="flex-1 px-4 py-3 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors">
            Cancel
          </button>
          <button onClick={handleAssignPackage} disabled={actionLoading || !selectedPackageId} className="flex-1 px-4 py-3 bg-white text-black rounded-lg font-medium hover:bg-zinc-200 disabled:opacity-50 transition-colors">
            {actionLoading ? "Assigning..." : "Assign"}
          </button>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal open={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete User">
        <p className="text-zinc-400 mb-6">Are you sure you want to delete <span className="text-white">{selectedUser?.email}</span>? This action cannot be undone.</p>
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4 flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={() => setShowDeleteModal(false)} className="flex-1 px-4 py-3 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors">
            Cancel
          </button>
          <button onClick={handleDeleteUser} disabled={actionLoading} className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 transition-colors">
            {actionLoading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
