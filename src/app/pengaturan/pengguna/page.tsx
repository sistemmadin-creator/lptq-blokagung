"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  UserPlus,
  Shield,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Eye,
  KeyRound,
  Lock,
  UserCheck,
  UserX,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { fetchCurrentUserProfile } from "@/lib/services/tahfidz-service";
import {
  SYSTEM_MODULES,
  DEFAULT_PERMISSIONS_BY_ROLE,
  fetchAdminUserList,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
  canUserEdit,
} from "@/lib/services/user-permission-service";
import type { AppRole, ModuleKey, PermissionLevel, Profile, UserAccountItem, UserPermissions } from "@/types/database";
import { useToast } from "@/components/ui/Toast";

export default function PengaturanPenggunaPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [users, setUsers] = useState<UserAccountItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Form State
  const [formUsername, setFormUsername] = useState("");
  const [formNama, setFormNama] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState<AppRole>("viewer");
  const [formStatus, setFormStatus] = useState<"active" | "suspended">("active");
  const [formHalaqohKelas, setFormHalaqohKelas] = useState<string>("");
  const [formHalaqohBagian, setFormHalaqohBagian] = useState<string>("");
  const [formPermissions, setFormPermissions] = useState<UserPermissions>(
    DEFAULT_PERMISSIONS_BY_ROLE.viewer
  );
  const [submitting, setSubmitting] = useState(false);

  // Delete Confirmation State
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<UserAccountItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Load Current Profile
  useEffect(() => {
    async function init() {
      try {
        const prof = await fetchCurrentUserProfile();
        setCurrentProfile(prof);
        if (!prof || (!canUserEdit(prof.permissions, "user_management") && prof.role !== "admin")) {
          showToast("error", "Anda tidak memiliki hak akses untuk mengelola pengguna.");
          router.push("/");
          return;
        }
        loadUsers();
      } catch {
        showToast("error", "Gagal memverifikasi hak akses pengguna.");
        router.push("/");
      } finally {
        setLoadingProfile(false);
      }
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function loadUsers() {
    setLoadingUsers(true);
    try {
      const data = await fetchAdminUserList();
      setUsers(data);
    } catch (err: any) {
      showToast("error", err.message || "Gagal memuat daftar pengguna.");
    } finally {
      setLoadingUsers(false);
    }
  }

  function handleOpenCreateModal() {
    setIsEditing(false);
    setEditingUserId(null);
    setFormUsername("");
    setFormNama("");
    setFormPassword("");
    setFormRole("pembimbing");
    setFormStatus("active");
    setFormHalaqohKelas("");
    setFormHalaqohBagian("");
    setFormPermissions({ ...DEFAULT_PERMISSIONS_BY_ROLE.pembimbing });
    setModalOpen(true);
  }

  function handleOpenEditModal(user: UserAccountItem) {
    setIsEditing(true);
    setEditingUserId(user.user_id);
    setFormUsername(user.username);
    setFormNama(user.nama);
    setFormPassword(""); // Kosongkan, hanya diisi jika ingin mereset password
    setFormRole(user.role);
    setFormStatus(user.status);
    setFormHalaqohKelas(user.halaqoh_kelas ? String(user.halaqoh_kelas) : "");
    setFormHalaqohBagian(user.halaqoh_bagian || "");
    setFormPermissions({ ...user.permissions });
    setModalOpen(true);
  }

  function handleRoleChange(newRole: AppRole) {
    setFormRole(newRole);
    // Terapkan default permission untuk role tersebut jika belum dikustomisasi
    setFormPermissions({ ...DEFAULT_PERMISSIONS_BY_ROLE[newRole] });
  }

  function handlePermissionChange(moduleKey: ModuleKey, level: PermissionLevel) {
    setFormPermissions((prev) => ({
      ...prev,
      [moduleKey]: level,
    }));
  }

  function applyPreset(preset: "all-edit" | "all-read" | "role-default") {
    if (preset === "all-edit") {
      const updated = { ...formPermissions };
      SYSTEM_MODULES.forEach((m) => (updated[m.key] = "edit"));
      setFormPermissions(updated);
    } else if (preset === "all-read") {
      const updated = { ...formPermissions };
      SYSTEM_MODULES.forEach((m) => (updated[m.key] = "baca"));
      setFormPermissions(updated);
    } else if (preset === "role-default") {
      setFormPermissions({ ...DEFAULT_PERMISSIONS_BY_ROLE[formRole] });
    }
  }

  async function handleSaveUser(e: React.FormEvent) {
    e.preventDefault();
    if (!formUsername.trim()) {
      showToast("error", "Nama pengguna wajib diisi.");
      return;
    }
    if (!formNama.trim()) {
      showToast("error", "Nama lengkap wajib diisi.");
      return;
    }
    if (!isEditing && (!formPassword || formPassword.length < 6)) {
      showToast("error", "Kata sandi minimal 6 karakter untuk akun baru.");
      return;
    }

    setSubmitting(true);
    try {
      if (isEditing && editingUserId) {
        await updateAdminUser(editingUserId, {
          username: formUsername.trim(),
          nama: formNama.trim(),
          password: formPassword.trim() || undefined,
          role: formRole,
          status: formStatus,
          halaqoh_kelas: formHalaqohKelas ? Number(formHalaqohKelas) : null,
          halaqoh_bagian: formHalaqohBagian || null,
          permissions: formPermissions,
        });
        showToast("success", `Pengguna "${formNama}" berhasil diperbarui.`);
      } else {
        await createAdminUser({
          username: formUsername.trim(),
          nama: formNama.trim(),
          password: formPassword.trim(),
          role: formRole,
          halaqoh_kelas: formHalaqohKelas ? Number(formHalaqohKelas) : null,
          halaqoh_bagian: formHalaqohBagian || null,
          permissions: formPermissions,
        });
        showToast("success", `Pengguna "${formNama}" berhasil dibuat.`);
      }
      setModalOpen(false);
      loadUsers();
    } catch (err: any) {
      showToast("error", err.message || "Gagal menyimpan data pengguna.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteUser() {
    if (!deleteConfirmUser) return;
    setDeleting(true);
    try {
      await deleteAdminUser(deleteConfirmUser.user_id);
      showToast("success", `Pengguna "${deleteConfirmUser.nama}" telah dihapus.`);
      setDeleteConfirmUser(null);
      loadUsers();
    } catch (err: any) {
      showToast("error", err.message || "Gagal menghapus pengguna.");
    } finally {
      setDeleting(false);
    }
  }

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      u.username.toLowerCase().includes(q) ||
      u.nama.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  if (loadingProfile) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Memverifikasi hak akses...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-brand font-bold text-xs uppercase tracking-wider mb-1">
            <Shield className="w-4 h-4" />
            <span>Hak Akses & Otoritas</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Manajemen Pengguna & Otoritas
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Kelola akun pengguna, peran, serta otoritas baca, edit, atau sembunyikan untuk setiap halaman sistem.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-hover shadow-sm transition"
        >
          <UserPlus className="w-4 h-4" />
          <span>Tambah Pengguna Baru</span>
        </button>
      </div>

      {/* Bar Pencarian & Statistik */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari berdasarkan nama, username, atau peran..."
            className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>

        <div className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-4">
          <span>Total: <strong className="text-slate-900 dark:text-white">{users.length}</strong> Pengguna</span>
          <span>Aktif: <strong className="text-emerald-600">{users.filter((u) => u.status === "active").length}</strong></span>
          {users.filter((u) => u.status === "suspended").length > 0 && (
            <span>Ditangguhkan: <strong className="text-rose-600">{users.filter((u) => u.status === "suspended").length}</strong></span>
          )}
        </div>
      </div>

      {/* Tabel Pengguna */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 dark:border-slate-800 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Pengguna</th>
                <th className="py-3 px-4">Peran</th>
                <th className="py-3 px-4">Halaqoh</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Ringkasan Hak Akses</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loadingUsers ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Memuat daftar pengguna...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Tidak ditemukan pengguna yang sesuai dengan pencarian.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const editCount = Object.values(u.permissions).filter((p) => p === "edit").length;
                  const readCount = Object.values(u.permissions).filter((p) => p === "baca").length;
                  const hideCount = Object.values(u.permissions).filter((p) => p === "sembunyikan").length;

                  return (
                    <tr
                      key={u.user_id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 text-brand font-black flex items-center justify-center shrink-0 uppercase text-xs dark:bg-emerald-950 dark:text-emerald-300">
                            {u.nama.substring(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 dark:text-white block truncate">
                              {u.nama}
                            </span>
                            <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                              @{u.username}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md font-bold text-[10px] uppercase tracking-wide ${
                            u.role === "admin"
                              ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                              : u.role === "pengurus"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                              : u.role === "pembimbing"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                              : u.role === "operator_absen"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                              : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        {u.halaqoh_kelas ? (
                          <span className="font-semibold">
                            Kelas {u.halaqoh_kelas} {u.halaqoh_bagian || ""}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {u.status === "active" ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-[11px]">
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Aktif</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-600 font-bold text-[11px]">
                            <UserX className="w-3.5 h-3.5" />
                            <span>Ditangguhkan</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300">
                            {editCount} Edit
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[10px] border border-blue-200 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300">
                            {readCount} Baca
                          </span>
                          {hideCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold text-[10px] border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400">
                              {hideCount} Tutup
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(u)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-brand hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition"
                            title="Edit Pengguna & Hak Akses"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {currentProfile?.user_id !== u.user_id && (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmUser(u)}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:bg-rose-950/50 transition"
                              title="Hapus Pengguna"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah / Edit Pengguna */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {isEditing ? `Edit Pengguna (@${formUsername})` : "Tambah Pengguna Baru"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tentukan kredensial akun dan matriks wewenang akses per modul.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-5">
              {/* Data Dasar Akun */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Pengguna (Username) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ""))}
                    placeholder="misal: pembimbing1b"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-brand focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Digunakan saat login. Huruf kecil, angka, titik, atau garis bawah.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Lengkap *
                  </label>
                  <input
                    type="text"
                    required
                    value={formNama}
                    onChange={(e) => setFormNama(e.target.value)}
                    placeholder="misal: Ust. Muhammad Zaini"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-brand focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Kata Sandi {isEditing ? "(Kosongkan jika tidak diubah)" : "*"}
                  </label>
                  <input
                    type="password"
                    required={!isEditing}
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder={isEditing ? "Biarkan kosong untuk tetap sama" : "Minimal 6 karakter"}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-brand focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Peran Utama (Role)
                  </label>
                  <select
                    value={formRole}
                    onChange={(e) => handleRoleChange(e.target.value as AppRole)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-brand focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white font-semibold"
                  >
                    <option value="admin">Admin (Akses Penuh)</option>
                    <option value="pengurus">Pengurus (Kelola Data & Evaluasi)</option>
                    <option value="pembimbing">Pembimbing (Setoran & Halaqoh)</option>
                    <option value="operator_absen">Operator Absen (Presensi)</option>
                    <option value="viewer">Viewer (Hanya Melihat)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Status Akun
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as "active" | "suspended")}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-brand focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white font-semibold"
                  >
                    <option value="active">Aktif (Dapat Masuk)</option>
                    <option value="suspended">Ditangguhkan (Akses Masuk Diblokir)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Kelas Halaqoh
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={formHalaqohKelas}
                      onChange={(e) => setFormHalaqohKelas(e.target.value)}
                      placeholder="1-12"
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Bagian
                    </label>
                    <input
                      type="text"
                      maxLength={2}
                      value={formHalaqohBagian}
                      onChange={(e) => setFormHalaqohBagian(e.target.value.toUpperCase())}
                      placeholder="A-F"
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Matriks Wewenang Akses Per Modul */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Matriks Hak Akses Seluruh Halaman
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Tentukan tingkat otoritas pengguna ini untuk setiap halaman sistem:
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => applyPreset("all-edit")}
                      className="px-2 py-1 text-[10px] font-bold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-300"
                    >
                      Semua Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset("all-read")}
                      className="px-2 py-1 text-[10px] font-bold rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 dark:bg-blue-950/50 dark:border-blue-800 dark:text-blue-300"
                    >
                      Semua Baca
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset("role-default")}
                      className="px-2 py-1 text-[10px] font-bold rounded-lg bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
                    >
                      Standar Peran
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto">
                  {SYSTEM_MODULES.map((mod) => {
                    const currentLevel = formPermissions[mod.key] || "sembunyikan";
                    return (
                      <div
                        key={mod.key}
                        className="p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900 dark:text-white">
                              {mod.label}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ({mod.group})
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {mod.description}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Sembunyikan */}
                          <button
                            type="button"
                            onClick={() => handlePermissionChange(mod.key, "sembunyikan")}
                            className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition ${
                              currentLevel === "sembunyikan"
                                ? "bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 shadow-sm"
                                : "bg-white text-slate-500 border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400"
                            }`}
                          >
                            Sembunyikan
                          </button>

                          {/* Baca */}
                          <button
                            type="button"
                            onClick={() => handlePermissionChange(mod.key, "baca")}
                            className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition ${
                              currentLevel === "baca"
                                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                : "bg-white text-slate-500 border-slate-200 hover:bg-blue-50 hover:text-blue-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400"
                            }`}
                          >
                            Baca
                          </button>

                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => handlePermissionChange(mod.key, "edit")}
                            className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition ${
                              currentLevel === "edit"
                                ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                                : "bg-white text-slate-500 border-slate-200 hover:bg-emerald-50 hover:text-emerald-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400"
                            }`}
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tombol Simpan / Batal */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-brand px-5 py-2 text-xs font-bold text-white hover:bg-brand-hover shadow-sm transition disabled:opacity-60"
                >
                  {submitting ? "Menyimpan..." : isEditing ? "Simpan Perubahan" : "Buat Pengguna"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4 dark:bg-rose-950 dark:text-rose-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-extrabold text-center text-slate-900 dark:text-white mb-2">
              Hapus Pengguna?
            </h3>
            <p className="text-xs text-center text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
              Akun <strong>@{deleteConfirmUser.username}</strong> ({deleteConfirmUser.nama}) akan dihapus secara permanen dari sistem dan tidak akan bisa masuk lagi.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmUser(null)}
                className="flex-1 rounded-xl border border-slate-300 bg-white py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteUser}
                className="flex-1 rounded-xl bg-rose-600 py-2 text-xs font-bold text-white hover:bg-rose-700 shadow-sm transition disabled:opacity-60"
              >
                {deleting ? "Menghapus..." : "Ya, Hapus Akun"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
