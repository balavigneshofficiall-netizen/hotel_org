"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users,
  UserPlus,
  Trash2,
  Pencil,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Eye,
  EyeOff,
  User,
  ShieldCheck,
  Crown,
  Mail,
  Lock,
  Check,
  Calendar,
  Shield,
  Copy,
  SlidersHorizontal,
} from "lucide-react";
import {
  ALL_PAGE_PERMISSIONS,
  DEFAULT_STAFF_PERMISSIONS,
  ALL_PERMISSION_KEYS,
} from "@/lib/permissions";

interface TeamMember {
  id: string | number;
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "ADMIN" | "STAFF";
  permissions: string[];
  plainPassword?: string;
  createdAt: string;
  hotel?: {
    name: string;
    slug?: string;
  };
}

type RoleFilter = "ALL" | "SUPER_ADMIN" | "ADMIN" | "STAFF";

export default function StaffManagementPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string>("STAFF");
  const [currentUserId, setCurrentUserId] = useState<string | number>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<RoleFilter>("ALL");

  // State to reveal password per member in table view
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string | number, boolean>>({});

  // Add Member Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formRole, setFormRole] = useState<"ADMIN" | "STAFF">("STAFF");
  const [formPermissions, setFormPermissions] = useState<string[]>(DEFAULT_STAFF_PERMISSIONS);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Edit Member Modal
  const [memberToEdit, setMemberToEdit] = useState<TeamMember | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<"SUPER_ADMIN" | "ADMIN" | "STAFF">("STAFF");
  const [editPassword, setEditPassword] = useState("");
  const [editShowPassword, setEditShowPassword] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState("");

  // Dedicated Permissions Modal
  const [memberForPermissions, setMemberForPermissions] = useState<TeamMember | null>(null);
  const [modalPermissions, setModalPermissions] = useState<string[]>([]);
  const [permissionsSubmitting, setPermissionsSubmitting] = useState(false);
  const [permissionsError, setPermissionsError] = useState("");

  // Delete confirmation modal
  const [memberToDelete, setMemberToDelete] = useState<TeamMember | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/admin/users", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load team members");
      }

      setMembers(data.users || []);
      setCurrentUserRole(data.currentUserRole || "STAFF");
      setCurrentUserId(data.currentUserId || "");

      if (data.currentUserRole === "ADMIN") {
        setFormRole("STAFF");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error loading team";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Handle User Creation
  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!formName.trim() || !formEmail.trim() || !formPassword) {
      setFormError("All fields are required.");
      return;
    }

    if (formPassword.length < 6) {
      setFormError("Password must be at least 6 characters long.");
      return;
    }

    try {
      setFormSubmitting(true);
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          email: formEmail.trim().toLowerCase(),
          password: formPassword,
          role: currentUserRole === "ADMIN" ? "STAFF" : formRole,
          permissions: formPermissions,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create user account");
      }

      setSuccessMessage(`${formName.trim()} added successfully!`);
      setTimeout(() => setSuccessMessage(""), 4000);

      setFormName("");
      setFormEmail("");
      setFormPassword("");
      setShowPassword(false);
      setFormPermissions(DEFAULT_STAFF_PERMISSIONS);
      setIsModalOpen(false);
      await fetchMembers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error creating account";
      setFormError(msg);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (member: TeamMember) => {
    setMemberToEdit(member);
    setEditName(member.name);
    setEditEmail(member.email);
    setEditRole(member.role);
    setEditPermissions(
      member.role === "SUPER_ADMIN"
        ? ALL_PERMISSION_KEYS
        : member.permissions || DEFAULT_STAFF_PERMISSIONS
    );
    setEditPassword("");
    setEditShowPassword(false);
    setShowOldPassword(false);
    setCopiedPassword(false);
    setEditError("");
  };

  // Open Dedicated Permissions Modal
  const openPermissionsModal = (member: TeamMember) => {
    setMemberForPermissions(member);
    setModalPermissions(
      member.role === "SUPER_ADMIN"
        ? ALL_PERMISSION_KEYS
        : member.permissions || DEFAULT_STAFF_PERMISSIONS
    );
    setPermissionsError("");
  };

  // Copy password helper
  const handleCopyPassword = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 2000);
  };

  // Handle User Edit
  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberToEdit) return;
    setEditError("");

    if (!editName.trim() || !editEmail.trim()) {
      setEditError("Name and Email are required.");
      return;
    }

    if (editPassword) {
      if (currentUserRole !== "SUPER_ADMIN") {
        setEditError("Only Super Admin can change passwords.");
        return;
      }
      if (editPassword.length < 6) {
        setEditError("New password must be at least 6 characters long.");
        return;
      }
    }

    try {
      setEditSubmitting(true);
      const payload: Record<string, unknown> = {
        name: editName.trim(),
        email: editEmail.trim().toLowerCase(),
        role: editRole,
      };

      if (currentUserRole === "SUPER_ADMIN") {
        payload.permissions = editPermissions;
        if (editPassword) {
          payload.password = editPassword;
        }
      }

      const res = await fetch(`/api/admin/users/${memberToEdit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update member");
      }

      setSuccessMessage(`${editName.trim()} updated successfully!`);
      setTimeout(() => setSuccessMessage(""), 4000);
      setMemberToEdit(null);
      await fetchMembers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error updating member";
      setEditError(msg);
    } finally {
      setEditSubmitting(false);
    }
  };

  // Handle Dedicated Permissions Save
  const handleSavePermissions = async () => {
    if (!memberForPermissions) return;
    setPermissionsError("");

    if (currentUserRole !== "SUPER_ADMIN") {
      setPermissionsError("Only Super Admin can change page permissions.");
      return;
    }

    try {
      setPermissionsSubmitting(true);
      const res = await fetch(`/api/admin/users/${memberForPermissions.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          permissions: modalPermissions,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save permissions");
      }

      setSuccessMessage(
        `Permissions saved for ${memberForPermissions.name} (${modalPermissions.length} pages enabled)`
      );
      setTimeout(() => setSuccessMessage(""), 4000);
      setMemberForPermissions(null);
      await fetchMembers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving permissions";
      setPermissionsError(msg);
    } finally {
      setPermissionsSubmitting(false);
    }
  };

  // Toggle permission helper
  const togglePermission = (
    key: string,
    currentList: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    if (currentList.includes(key)) {
      setList(currentList.filter((k) => k !== key));
    } else {
      setList([...currentList, key]);
    }
  };

  // Handle Deletion
  const confirmDeleteMember = async () => {
    if (!memberToDelete) return;

    try {
      setDeleting(true);
      const res = await fetch(`/api/admin/users/${memberToDelete.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to remove member");
      }

      setSuccessMessage(`${memberToDelete.name} was removed.`);
      setTimeout(() => setSuccessMessage(""), 4000);
      setMemberToDelete(null);
      await fetchMembers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error removing member";
      setError(msg);
      setTimeout(() => setError(""), 4000);
    } finally {
      setDeleting(false);
    }
  };

  // Metric counts for top links
  const totalCount = members.length;
  const superAdminCount = members.filter((m) => m.role === "SUPER_ADMIN").length;
  const adminCount = members.filter((m) => m.role === "ADMIN").length;
  const staffCount = members.filter((m) => m.role === "STAFF").length;

  // Filtered members
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q);
      const matchesRole =
        selectedRoleFilter === "ALL" || m.role === selectedRoleFilter;
      return matchesSearch && matchesRole;
    });
  }, [members, searchQuery, selectedRoleFilter]);

  const canCreate =
    currentUserRole === "SUPER_ADMIN" || currentUserRole === "ADMIN";

  const isSuperAdmin = currentUserRole === "SUPER_ADMIN";

  return (
    <div className="space-y-4">
      {/* ───── Header Bar ───── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#E5E2D9]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#12372A] to-[#1a4a38] flex items-center justify-center shadow-xs">
            <Users className="w-5 h-5 text-[#C9A227]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-[#171717] tracking-tight">
                Staff Management
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase tracking-wider bg-[#12372A] text-[#C9A227] border border-[#C9A227]/30">
                {currentUserRole.replace("_", " ")}
              </span>
            </div>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Total {members.length} team members registered
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-9 pr-7 py-2 bg-[#FAF9F6] border border-[#E5E2D9] rounded-xl text-xs font-medium text-[#171717] placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-[#12372A] focus:bg-white transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Add Member Button */}
          {canCreate && (
            <button
              onClick={() => {
                setFormError("");
                setFormPermissions(DEFAULT_STAFF_PERMISSIONS);
                setIsModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#12372A] to-[#1a4a38] hover:from-[#0e2b21] hover:to-[#12372A] active:scale-95 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
            >
              <UserPlus className="w-4 h-4 text-[#C9A227]" />
              <span>Add Member</span>
            </button>
          )}
        </div>
      </div>

      {/* ───── Top Links (Role Filter Tabs) ───── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {([
          { id: "ALL" as const, label: "All Members", count: totalCount },
          { id: "SUPER_ADMIN" as const, label: "Super Admin", count: superAdminCount },
          { id: "ADMIN" as const, label: "Admins", count: adminCount },
          { id: "STAFF" as const, label: "Staff", count: staffCount },
        ]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedRoleFilter(tab.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              selectedRoleFilter === tab.id
                ? "bg-[#12372A] text-white shadow-xs"
                : "bg-[#FAF9F6] text-[#6B7280] border border-[#E5E2D9] hover:bg-stone-100 hover:text-[#171717]"
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`px-1.5 py-0.2 rounded-md text-[10px] font-extrabold ${
                selectedRoleFilter === tab.id
                  ? "bg-[#C9A227] text-black"
                  : tab.id === "SUPER_ADMIN"
                  ? "bg-amber-100 text-amber-800"
                  : tab.id === "ADMIN"
                  ? "bg-emerald-100 text-emerald-800"
                  : tab.id === "STAFF"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-stone-200 text-stone-700"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* ───── Status Alerts ───── */}
      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-800 shadow-2xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage("")}
            className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between text-xs text-red-800 shadow-2xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
          <button
            onClick={() => setError("")}
            className="text-red-700 hover:text-red-900 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ───── Professional Staff Table ───── */}
      <div className="bg-white rounded-3xl border border-[#E5E2D9] shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-[#6B7280]">
            <Loader2 className="w-7 h-7 animate-spin mx-auto text-[#12372A] mb-2" />
            <p className="text-xs font-bold text-[#171717]">Loading staff roster...</p>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="p-12 text-center text-[#6B7280]">
            <p className="text-xs font-semibold">No staff members found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF9F6] border-b border-[#E5E2D9] text-[#6B7280] font-extrabold text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-5">Staff Member</th>
                  <th className="py-3.5 px-4">Email</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Password</th>
                  <th className="py-3.5 px-4">Allowed Pages</th>
                  <th className="py-3.5 px-4 hidden sm:table-cell">Joined Date</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E2D9]">
                {filteredMembers.map((member) => {
                  const isSelf = String(member.id) === String(currentUserId);
                  const firstLetter = member.name.trim().charAt(0).toUpperCase();
                  const isPasswordRevealed = revealedPasswords[member.id];

                  const canDelete =
                    !isSelf &&
                    (currentUserRole === "SUPER_ADMIN" ||
                      (currentUserRole === "ADMIN" && member.role === "STAFF"));

                  const canEdit =
                    currentUserRole === "SUPER_ADMIN" ||
                    (currentUserRole === "ADMIN" && (member.role === "STAFF" || isSelf));

                  const permCount =
                    member.role === "SUPER_ADMIN"
                      ? ALL_PAGE_PERMISSIONS.length
                      : (member.permissions || []).length;

                  return (
                    <tr
                      key={member.id}
                      className="hover:bg-[#FAF9F6]/80 transition duration-150 group"
                    >
                      {/* Name */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs shrink-0 shadow-2xs ${
                              member.role === "SUPER_ADMIN"
                                ? "bg-gradient-to-br from-[#C9A227] to-[#8c6f14] text-black"
                                : member.role === "ADMIN"
                                ? "bg-gradient-to-br from-[#12372A] to-[#1a4a38] text-white"
                                : "bg-gradient-to-br from-blue-600 to-indigo-700 text-white"
                            }`}
                          >
                            {firstLetter}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-[#171717] text-xs">
                                {member.name}
                              </span>
                              {isSelf && (
                                <span className="px-1.5 py-0.2 rounded bg-[#12372A] text-[#C9A227] text-[9px] font-black uppercase">
                                  You
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3.5 px-4 text-[#6B7280] font-medium">
                        {member.email}
                      </td>

                      {/* Role Tier */}
                      <td className="py-3.5 px-4">
                        {member.role === "SUPER_ADMIN" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-xl bg-amber-50 text-amber-900 font-extrabold text-[11px] border border-amber-200">
                            <Crown className="w-3 h-3 text-[#C9A227]" />
                            Super Admin
                          </span>
                        ) : member.role === "ADMIN" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-xl bg-emerald-50 text-[#12372A] font-extrabold text-[11px] border border-emerald-200">
                            <ShieldCheck className="w-3 h-3 text-emerald-700" />
                            Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-xl bg-blue-50 text-blue-700 font-extrabold text-[11px] border border-blue-200">
                            <User className="w-3 h-3 text-blue-600" />
                            Staff
                          </span>
                        )}
                      </td>

                      {/* Password */}
                      <td className="py-3.5 px-4">
                        {isSuperAdmin ? (
                          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-xl bg-[#FAF9F6] border border-[#E5E2D9] text-xs shadow-2xs">
                            <span className="font-mono text-xs font-bold text-[#171717]">
                              {isPasswordRevealed ? (member.plainPassword || "••••••••") : "••••••••"}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setRevealedPasswords((prev) => ({
                                  ...prev,
                                  [member.id]: !prev[member.id],
                                }))
                              }
                              className="text-stone-400 hover:text-[#12372A] transition cursor-pointer p-0.5"
                              title={isPasswordRevealed ? "Hide password" : "View password"}
                            >
                              {isPasswordRevealed ? (
                                <EyeOff className="w-3.5 h-3.5 text-stone-600" />
                              ) : (
                                <Eye className="w-3.5 h-3.5 text-[#12372A]" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#FAF9F6] border border-[#E5E2D9] text-stone-400 text-xs shadow-2xs font-mono">
                            <Lock className="w-3 h-3 text-stone-400" />
                            <span>••••••••</span>
                          </div>
                        )}
                      </td>

                      {/* Allowed Pages Badge */}
                      <td className="py-3.5 px-4">
                        {member.role === "SUPER_ADMIN" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 font-bold text-[11px]">
                            <Crown className="w-3 h-3 text-[#C9A227]" />
                            <span>All Pages</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openPermissionsModal(member)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#12372A] border border-emerald-200 font-bold text-[11px] transition cursor-pointer"
                            title="Click to view or edit page permissions"
                          >
                            <SlidersHorizontal className="w-3 h-3 text-[#C9A227]" />
                            <span>{permCount} / {ALL_PAGE_PERMISSIONS.length} Pages</span>
                          </button>
                        )}
                      </td>

                      {/* Joined Date */}
                      <td className="py-3.5 px-4 hidden sm:table-cell text-[#6B7280] text-[11px] font-medium">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-stone-400" />
                          <span>
                            {new Date(member.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Permissions Button */}
                          <button
                            onClick={() => openPermissionsModal(member)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition active:scale-95 cursor-pointer"
                            title="Configure allowed pages"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5 text-[#C9A227]" />
                            <span>Permissions</span>
                          </button>

                          {canEdit && (
                            <button
                              onClick={() => openEditModal(member)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50/90 hover:bg-[#12372A] text-[#12372A] hover:text-[#C9A227] border border-emerald-200/90 hover:border-[#12372A] text-xs font-bold transition active:scale-95 cursor-pointer"
                              title={`Edit ${member.name}`}
                            >
                              <Pencil className="w-3.5 h-3.5 text-emerald-700" />
                              <span>Edit</span>
                            </button>
                          )}

                          {canDelete && (
                            <button
                              onClick={() => setMemberToDelete(member)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-red-50/90 hover:bg-red-600 text-red-600 hover:text-white border border-red-200/90 hover:border-red-600 text-xs font-bold transition active:scale-95 cursor-pointer"
                              title={`Remove ${member.name}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          )}

                          {!canEdit && !canDelete && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#FAF9F6] text-stone-500 font-extrabold text-[10px] border border-stone-200">
                              <Shield className="w-3 h-3 text-stone-400" />
                              Protected
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ───── Simple Page Permissions Modal ───── */}
      {memberForPermissions && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-[#E5E2D9] overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 bg-gradient-to-r from-[#0B241B] to-[#12372A] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#C9A227] text-[#0B241B] flex items-center justify-center font-bold">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">
                    Page Permissions: {memberForPermissions.name}
                  </h3>
                  <p className="text-[11px] text-emerald-200/80">
                    Role: {memberForPermissions.role}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMemberForPermissions(null)}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error banner */}
            {permissionsError && (
              <div className="mx-4 mt-3 p-2.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-800">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span className="font-semibold">{permissionsError}</span>
              </div>
            )}

            {/* Quick Actions (Select All / Clear All) */}
            {isSuperAdmin && memberForPermissions.role !== "SUPER_ADMIN" && (
              <div className="px-4 pt-3 pb-1 flex items-center justify-between gap-2 border-b border-[#E5E2D9]/60 shrink-0">
                <span className="text-xs font-bold text-[#171717]">
                  Selected: {modalPermissions.length} / {ALL_PAGE_PERMISSIONS.length}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setModalPermissions(ALL_PERMISSION_KEYS)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-xs font-bold text-[#12372A] transition cursor-pointer"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalPermissions([])}
                    className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-xs font-bold text-stone-700 transition cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            )}

            {/* Simple Checkbox Grid — NO SUBHEADINGS, NO LONG TEXT */}
            <div className="p-4 overflow-y-auto flex-1">
              {memberForPermissions.role === "SUPER_ADMIN" ? (
                <div className="py-8 text-center text-xs text-[#6B7280]">
                  <Crown className="w-7 h-7 text-[#C9A227] mx-auto mb-1.5" />
                  <p className="font-bold text-[#171717]">Super Admin has access to all pages.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {ALL_PAGE_PERMISSIONS.map((perm) => {
                    const isChecked = modalPermissions.includes(perm.key);
                    const disabled = !isSuperAdmin;

                    return (
                      <div
                        key={perm.key}
                        onClick={() => {
                          if (!disabled) {
                            togglePermission(perm.key, modalPermissions, setModalPermissions);
                          }
                        }}
                        className={`px-3 py-2.5 rounded-xl border flex items-center gap-2.5 transition select-none ${
                          disabled ? "cursor-default opacity-80" : "cursor-pointer active:scale-98"
                        } ${
                          isChecked
                            ? "bg-emerald-50 border-emerald-400 text-[#12372A] font-bold"
                            : "bg-[#FAF9F6] border-[#E5E2D9] text-[#4B5563] hover:bg-stone-50"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition ${
                            isChecked
                              ? "border-[#12372A] bg-[#12372A] text-white"
                              : "border-stone-300 bg-white"
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 text-[#C9A227] stroke-[3]" />}
                        </div>
                        <span className="text-xs truncate">{perm.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 border-t border-[#E5E2D9] bg-[#FAF9F6] flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setMemberForPermissions(null)}
                className="px-4 py-2 rounded-xl border border-[#E5E2D9] bg-white hover:bg-stone-50 text-xs font-bold text-[#6B7280] transition cursor-pointer"
              >
                {isSuperAdmin && memberForPermissions.role !== "SUPER_ADMIN" ? "Cancel" : "Close"}
              </button>

              {isSuperAdmin && memberForPermissions.role !== "SUPER_ADMIN" && (
                <button
                  type="button"
                  onClick={handleSavePermissions}
                  disabled={permissionsSubmitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#12372A] to-[#1a4a38] text-white text-xs font-black shadow-xs hover:from-[#0e2b21] hover:to-[#12372A] transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {permissionsSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C9A227]" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save</span>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ───── Add Member Modal ───── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-[#E5E2D9] overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 bg-gradient-to-r from-[#0B241B] to-[#12372A] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#C9A227] text-[#0B241B] flex items-center justify-center font-bold">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm">Add New Staff Member</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateMember} className="p-4 space-y-3.5 overflow-y-auto flex-1">
              {formError && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-800">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span className="font-semibold">{formError}</span>
                </div>
              )}

              {/* Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#171717] block">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#12372A]/70" />
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Staff name"
                    className="w-full pl-10 pr-3.5 py-2 bg-[#FAF9F6] border border-[#E5E2D9] focus:bg-white focus:border-[#12372A] rounded-xl text-xs font-semibold text-[#171717] transition"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#171717] block">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#12372A]/70" />
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="staff@hotelannapoorna.com"
                    className="w-full pl-10 pr-3.5 py-2 bg-[#FAF9F6] border border-[#E5E2D9] focus:bg-white focus:border-[#12372A] rounded-xl text-xs font-semibold text-[#171717] transition"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#171717] block">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#12372A]/70" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full pl-10 pr-10 py-2 bg-[#FAF9F6] border border-[#E5E2D9] focus:bg-white focus:border-[#12372A] rounded-xl text-xs font-semibold text-[#171717] transition"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Role Cards */}
              <div className="space-y-1 pt-1">
                <label className="text-xs font-bold text-[#171717] block">
                  Role
                </label>
                {currentUserRole === "ADMIN" ? (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-semibold">
                    Role: Staff (Operations)
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFormRole("STAFF");
                        setFormPermissions(DEFAULT_STAFF_PERMISSIONS);
                      }}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        formRole === "STAFF"
                          ? "bg-amber-50 border-[#C9A227] text-amber-950 font-bold"
                          : "bg-[#FAF9F6] border-[#E5E2D9] text-[#6B7280]"
                      }`}
                    >
                      Staff
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormRole("ADMIN");
                        setFormPermissions(ALL_PERMISSION_KEYS);
                      }}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        formRole === "ADMIN"
                          ? "bg-emerald-50 border-[#12372A] text-[#12372A] font-bold"
                          : "bg-[#FAF9F6] border-[#E5E2D9] text-[#6B7280]"
                      }`}
                    >
                      Admin
                    </button>
                  </div>
                )}
              </div>

              {/* Simple Permissions Checklist */}
              {isSuperAdmin && (
                <div className="space-y-1.5 pt-2 border-t border-[#E5E2D9]">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#171717]">
                      Allowed Pages
                    </label>
                    <span className="text-[11px] font-bold text-[#12372A]">
                      {formPermissions.length} selected
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto p-1.5 bg-[#FAF9F6] border border-[#E5E2D9] rounded-xl">
                    {ALL_PAGE_PERMISSIONS.map((perm) => {
                      const isChecked = formPermissions.includes(perm.key);
                      return (
                        <div
                          key={perm.key}
                          onClick={() => togglePermission(perm.key, formPermissions, setFormPermissions)}
                          className={`px-2.5 py-1.5 rounded-lg border text-xs flex items-center gap-2 cursor-pointer transition ${
                            isChecked
                              ? "bg-emerald-50 border-emerald-300 text-[#12372A] font-bold"
                              : "bg-white border-[#E5E2D9] text-[#6B7280]"
                          }`}
                        >
                          <div
                            className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                              isChecked
                                ? "border-[#12372A] bg-[#12372A] text-white"
                                : "border-stone-300 bg-white"
                            }`}
                          >
                            {isChecked && <Check className="w-2.5 h-2.5 text-[#C9A227] stroke-[3]" />}
                          </div>
                          <span className="truncate">{perm.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 border-t border-[#E5E2D9] flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#E5E2D9] text-xs font-bold text-[#6B7280] hover:bg-stone-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#12372A] to-[#1a4a38] text-white text-xs font-black shadow-xs transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {formSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C9A227]" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create Member</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───── Edit Member Modal ───── */}
      {memberToEdit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-[#E5E2D9] overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 bg-gradient-to-r from-[#0B241B] to-[#12372A] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#C9A227] text-[#0B241B] flex items-center justify-center font-bold">
                  <Pencil className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm">Edit Staff Member</h3>
              </div>
              <button
                onClick={() => setMemberToEdit(null)}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleUpdateMember} className="p-4 space-y-3.5 overflow-y-auto flex-1">
              {editError && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-800">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span className="font-semibold">{editError}</span>
                </div>
              )}

              {/* Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#171717] block">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#12372A]/70" />
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2 bg-[#FAF9F6] border border-[#E5E2D9] focus:bg-white focus:border-[#12372A] rounded-xl text-xs font-semibold text-[#171717] transition"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#171717] block">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#12372A]/70" />
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2 bg-[#FAF9F6] border border-[#E5E2D9] focus:bg-white focus:border-[#12372A] rounded-xl text-xs font-semibold text-[#171717] transition"
                    required
                  />
                </div>
              </div>

              {/* Current Password — ONLY visible to Super Admin */}
              {isSuperAdmin && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#171717] block">
                    Current Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#12372A]/70" />
                    <input
                      type={showOldPassword ? "text" : "password"}
                      value={memberToEdit.plainPassword || "••••••••"}
                      readOnly
                      className="w-full pl-10 pr-20 py-2 bg-[#FAF9F6] border border-[#E5E2D9] rounded-xl text-xs font-bold text-[#171717] select-all cursor-default"
                    />
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setShowOldPassword(!showOldPassword)}
                        className="p-1 text-stone-400 hover:text-stone-700 cursor-pointer"
                        title={showOldPassword ? "Hide password" : "View password"}
                      >
                        {showOldPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-[#12372A]" />}
                      </button>
                      {memberToEdit.plainPassword && (
                        <button
                          type="button"
                          onClick={() => handleCopyPassword(memberToEdit.plainPassword!)}
                          className="p-1 text-stone-400 hover:text-[#12372A] cursor-pointer"
                          title="Copy password"
                        >
                          {copiedPassword ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* New Password - STRICTLY Super Admin Only */}
              {isSuperAdmin ? (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#171717] block">
                    Change Password <span className="text-[#9CA3AF] font-normal">(leave blank to keep current)</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#12372A]/70" />
                    <input
                      type={editShowPassword ? "text" : "password"}
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full pl-10 pr-10 py-2 bg-[#FAF9F6] border border-[#E5E2D9] focus:bg-white focus:border-[#12372A] rounded-xl text-xs font-semibold text-[#171717] transition"
                    />
                    <button
                      type="button"
                      onClick={() => setEditShowPassword(!editShowPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer p-1"
                    >
                      {editShowPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-stone-50 border border-stone-200/80 rounded-xl flex items-center gap-2.5 text-xs text-stone-500 font-medium">
                  <Lock className="w-4 h-4 text-stone-400 shrink-0" />
                  <span>Password can only be changed by Super Admin</span>
                </div>
              )}

              {/* Role */}
              <div className="space-y-1 pt-1">
                <label className="text-xs font-bold text-[#171717] block">
                  Role Tier
                </label>
                {currentUserRole === "SUPER_ADMIN" ? (
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { role: "STAFF" as const, label: "Staff" },
                      { role: "ADMIN" as const, label: "Admin" },
                      { role: "SUPER_ADMIN" as const, label: "Super Admin" },
                    ].map((item) => (
                      <button
                        key={item.role}
                        type="button"
                        onClick={() => setEditRole(item.role)}
                        className={`py-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                          editRole === item.role
                            ? "bg-[#12372A] text-white border-[#12372A]"
                            : "bg-[#FAF9F6] text-[#6B7280] border-[#E5E2D9] hover:bg-stone-50"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-2.5 bg-[#FAF9F6] border border-[#E5E2D9] rounded-xl text-xs text-[#6B7280]">
                    Role: <strong className="text-[#171717]">{editRole}</strong>
                  </div>
                )}
              </div>

              {/* Allowed Pages Checklist */}
              {isSuperAdmin && editRole !== "SUPER_ADMIN" && (
                <div className="space-y-1.5 pt-2 border-t border-[#E5E2D9]">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#171717]">
                      Allowed Pages
                    </label>
                    <span className="text-[11px] font-bold text-[#12372A]">
                      {editPermissions.length} selected
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto p-1.5 bg-[#FAF9F6] border border-[#E5E2D9] rounded-xl">
                    {ALL_PAGE_PERMISSIONS.map((perm) => {
                      const isChecked = editPermissions.includes(perm.key);
                      return (
                        <div
                          key={perm.key}
                          onClick={() => togglePermission(perm.key, editPermissions, setEditPermissions)}
                          className={`px-2.5 py-1.5 rounded-lg border text-xs flex items-center gap-2 cursor-pointer transition ${
                            isChecked
                              ? "bg-emerald-50 border-emerald-300 text-[#12372A] font-bold"
                              : "bg-white border-[#E5E2D9] text-[#6B7280]"
                          }`}
                        >
                          <div
                            className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                              isChecked
                                ? "border-[#12372A] bg-[#12372A] text-white"
                                : "border-stone-300 bg-white"
                            }`}
                          >
                            {isChecked && <Check className="w-2.5 h-2.5 text-[#C9A227] stroke-[3]" />}
                          </div>
                          <span className="truncate">{perm.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 border-t border-[#E5E2D9] flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setMemberToEdit(null)}
                  className="px-4 py-2 rounded-xl border border-[#E5E2D9] text-xs font-bold text-[#6B7280] hover:bg-stone-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#12372A] to-[#1a4a38] text-white text-xs font-black shadow-xs transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {editSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C9A227]" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───── Delete Confirmation Modal ───── */}
      {memberToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl border border-[#E5E2D9] p-5 space-y-3.5 animate-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center">
              <h3 className="font-extrabold text-sm text-[#171717]">
                Remove Staff Member?
              </h3>
              <p className="text-xs text-[#6B7280] mt-1">
                Are you sure you want to remove{" "}
                <strong className="text-[#171717]">{memberToDelete.name}</strong> ({memberToDelete.role})?
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setMemberToDelete(null)}
                disabled={deleting}
                className="flex-1 py-2 rounded-xl border border-[#E5E2D9] text-xs font-bold text-[#6B7280] hover:bg-stone-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteMember}
                disabled={deleting}
                className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                {deleting ? "Removing..." : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
