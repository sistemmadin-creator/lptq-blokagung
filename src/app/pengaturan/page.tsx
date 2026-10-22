"use client";

import React, { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Settings,
  Palette,
  Users,
  Award,
  Building,
  MessageSquare,
  Database,
  Upload,
  RotateCcw,
  Check,
  CheckCircle2,
  Image as ImageIcon,
  Sliders,
  Shield,
  UserPlus,
  Search,
  Edit2,
  Trash2,
  UserCheck,
  UserX,
  AlertTriangle,
  FileSpreadsheet,
  Download,
  KeyRound,
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
import {
  fetchAppBranding,
  saveAppBranding,
  DEFAULT_BRANDING,
  type AppBrandingConfig,
} from "@/lib/services/branding-service";
import type { AppRole, ModuleKey, PermissionLevel, Profile, UserAccountItem, UserPermissions } from "@/types/database";
import { useToast } from "@/components/ui/Toast";
import { HierarchySettingsModal } from "@/components/santri/HierarchySettingsModal";
import {
  HierarchyRule,
  loadHierarchyRules,
  saveHierarchyRules,
} from "@/lib/services/hierarchy-service";

type ActiveTab = "branding" | "pengguna" | "tahfidz" | "kamar" | "waha" | "backup";

function PengaturanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const tabParam = (searchParams.get("tab") as ActiveTab) || "branding";
  const [activeTab, setActiveTab] = useState<ActiveTab>(tabParam);

  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // ----------------------------------------------------
  // STATE: TAB 1 - BRANDING & TAMPILAN
  // ----------------------------------------------------
  const [branding, setBranding] = useState<AppBrandingConfig>(DEFAULT_BRANDING);
  const [savingBranding, setSavingBranding] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  // ----------------------------------------------------
  // STATE: TAB 2 - PENGGUNA & HAK AKSES
  // ----------------------------------------------------
  const [users, setUsers] = useState<UserAccountItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

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
  const [submittingUser, setSubmittingUser] = useState(false);

  const [deleteConfirmUser, setDeleteConfirmUser] = useState<UserAccountItem | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);

  // ----------------------------------------------------
  // STATE: TAB 4 - HIERARKI KAMAR
  // ----------------------------------------------------
  const [hierarchyModalOpen, setHierarchyModalOpen] = useState(false);
  const [hierarchyRules, setHierarchyRules] = useState<HierarchyRule[]>([]);

  // Init Data
  useEffect(() => {
    async function init() {
      try {
        const prof = await fetchCurrentUserProfile();
        setCurrentProfile(prof);

        if (!prof || (!canUserEdit(prof.permissions, "user_management") && prof.role !== "admin")) {
          showToast("error", "Anda tidak memiliki hak akses untuk membuka halaman pengaturan.");
          router.push("/");
          return;
        }

        const brandData = await fetchAppBranding();
        setBranding(brandData);
        loadUsers();

        const rules = await loadHierarchyRules();
        setHierarchyRules(rules);
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

  useEffect(() => {
    if (searchParams.get("tab")) {
      setActiveTab(searchParams.get("tab") as ActiveTab);
    }
  }, [searchParams]);

  const switchTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    router.replace(`/pengaturan?tab=${tab}`, { scroll: false });
  };

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

  // ----------------------------------------------------
  // HANDLERS: TAB 1 - BRANDING
  // ----------------------------------------------------
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast("error", "Ukuran file logo maksimal 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setBranding((prev) => ({ ...prev, logo_url: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleFaviconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1 * 1024 * 1024) {
      showToast("error", "Ukuran file favicon maksimal 1MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setBranding((prev) => ({ ...prev, favicon_url: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast("error", "Ukuran gambar background maksimal 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setBranding((prev) => ({ ...prev, login_bg_url: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBranding(true);
    try {
      await saveAppBranding(branding);
      showToast("success", "Pengaturan tampilan dan identitas aplikasi berhasil disimpan.");
    } catch (err: any) {
      showToast("error", err.message || "Gagal menyimpan pengaturan tampilan.");
    } finally {
      setSavingBranding(false);
    }
  };

  // ----------------------------------------------------
  // HANDLERS: TAB 2 - PENGGUNA
  // ----------------------------------------------------
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
    setFormPassword("");
    setFormRole(user.role);
    setFormStatus(user.status);
    setFormHalaqohKelas(user.halaqoh_kelas ? String(user.halaqoh_kelas) : "");
    setFormHalaqohBagian(user.halaqoh_bagian || "");
    setFormPermissions({ ...user.permissions });
    setModalOpen(true);
  }

  function handleRoleChange(newRole: AppRole) {
    setFormRole(newRole);
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

    setSubmittingUser(true);
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
      setSubmittingUser(false);
    }
  }

  async function handleDeleteUser() {
    if (!deleteConfirmUser) return;
    setDeletingUser(true);
    try {
      await deleteAdminUser(deleteConfirmUser.user_id);
      showToast("success", `Pengguna "${deleteConfirmUser.nama}" telah dihapus.`);
      setDeleteConfirmUser(null);
      loadUsers();
    } catch (err: any) {
      showToast("error", err.message || "Gagal menghapus pengguna.");
    } finally {
      setDeletingUser(false);
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
      {/* Header Halaman Pengaturan */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-brand font-bold text-xs uppercase tracking-wider mb-1">
            <Settings className="w-4 h-4" />
            <span>Pusat Konfigurasi Sistem</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Pengaturan Aplikasi
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Kelola identitas visual (logo, favicon, background), akun pengguna & otoritas, standar KKM tahfidz, dan integrasi sistem.
          </p>
        </div>
      </div>

      {/* Navigasi Tab Horizontal Modern */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => switchTab("branding")}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
            activeTab === "branding"
              ? "bg-brand text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>Tampilan & Logo</span>
        </button>

        <button
          type="button"
          onClick={() => switchTab("pengguna")}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
            activeTab === "pengguna"
              ? "bg-brand text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Pengguna & Otoritas</span>
        </button>

        <button
          type="button"
          onClick={() => switchTab("tahfidz")}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
            activeTab === "tahfidz"
              ? "bg-brand text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Standar KKM & Tahfidz</span>
        </button>

        <button
          type="button"
          onClick={() => switchTab("kamar")}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
            activeTab === "kamar"
              ? "bg-brand text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Hierarki Kamar & Asrama</span>
        </button>

        <button
          type="button"
          onClick={() => switchTab("waha")}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
            activeTab === "waha"
              ? "bg-brand text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Integrasi WhatsApp</span>
        </button>

        <button
          type="button"
          onClick={() => switchTab("backup")}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
            activeTab === "backup"
              ? "bg-brand text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Cadangan Data (Backup)</span>
        </button>
      </div>

      {/* =================================================================== */}
      {/* TAB 1: TAMPILAN & LOGO (IDENTITAS BRANDING)                         */}
      {/* =================================================================== */}
      {activeTab === "branding" && (
        <form onSubmit={handleSaveBranding} className="space-y-6">
          <input
            type="file"
            ref={logoInputRef}
            accept="image/png,image/svg+xml,image/webp,image/jpeg"
            onChange={handleLogoUpload}
            className="hidden"
          />
          <input
            type="file"
            ref={faviconInputRef}
            accept="image/x-icon,image/png,image/svg+xml"
            onChange={handleFaviconUpload}
            className="hidden"
          />
          <input
            type="file"
            ref={bgInputRef}
            accept="image/jpeg,image/png,image/webp"
            onChange={handleBgUpload}
            className="hidden"
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bagian A: Logo Aplikasi (Sidebar, Kop Dokumen, & Form Login) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
              <div className="flex items-center gap-2 text-brand font-bold text-xs uppercase tracking-wider">
                <ImageIcon className="w-4 h-4" />
                <span>1. Logo Utama Aplikasi</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tampil pada menu samping (sidebar kiri), kartu halaman login, serta kop surat cetak PDF rekap nilai.
              </p>

              <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-brand-dark flex items-center justify-center text-white overflow-hidden shadow-md shrink-0 border border-emerald-400/30">
                  {branding.logo_url ? (
                    <img
                      src={branding.logo_url}
                      alt="Logo Pratinjau"
                      className="w-full h-full object-contain p-1.5"
                    />
                  ) : (
                    <svg
                      className="w-8 h-8 text-amber-300"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                    </svg>
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-800 hover:bg-slate-100 shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Ganti File Logo</span>
                    </button>
                    {branding.logo_url && (
                      <button
                        type="button"
                        onClick={() => setBranding((prev) => ({ ...prev, logo_url: null }))}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset Bawaan</span>
                      </button>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 block">
                    Format disarankan: PNG transparan atau SVG. Maksimal 2MB.
                  </span>
                </div>
              </div>

              {/* Favicon Browser */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Favicon Browser (Ikon Tab Peramban)
                </span>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700 shrink-0 overflow-hidden">
                    {branding.favicon_url ? (
                      <img src={branding.favicon_url} alt="Favicon" className="w-5 h-5 object-contain" />
                    ) : (
                      <span className="text-xs font-bold text-emerald-600">✓</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => faviconInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Pilih Favicon (.ico / .png)</span>
                  </button>
                  {branding.favicon_url && (
                    <button
                      type="button"
                      onClick={() => setBranding((prev) => ({ ...prev, favicon_url: null }))}
                      className="text-xs text-rose-600 hover:underline"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Bagian B: Latar Belakang Login (Background) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
              <div className="flex items-center gap-2 text-brand font-bold text-xs uppercase tracking-wider">
                <Sliders className="w-4 h-4" />
                <span>2. Gambar Background & Suasana Halaman Login</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Atur foto dokumentasi latar belakang login dan intensitas kegelapan lapisan (*dark overlay*).
              </p>

              {/* Preview Thumbnail */}
              <div className="relative h-40 w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-950 flex items-center justify-center shadow-inner">
                <div
                  className="absolute inset-0 bg-cover bg-center transition-all duration-300"
                  style={{ backgroundImage: `url('${branding.login_bg_url || "/images/login-bg.jpg"}')` }}
                />
                <div
                  className="absolute inset-0 bg-gradient-to-b from-slate-950 via-emerald-950 to-slate-950 transition-all duration-300"
                  style={{ opacity: branding.login_bg_overlay / 100 }}
                />
                <div className="relative z-10 px-4 py-2 rounded-xl bg-white/95 text-slate-900 text-center shadow-xl border border-white/20">
                  <span className="text-xs font-black block">LPTQ Blokagung</span>
                  <span className="text-[10px] text-slate-500">Pratinjau Kartu Login</span>
                </div>
              </div>

              {/* Kontrol Ganti Gambar & Slider Opacity */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => bgInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-800 hover:bg-slate-100 shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Ganti Foto Background</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setBranding((prev) => ({
                        ...prev,
                        login_bg_url: "/images/login-bg.jpg",
                        login_bg_overlay: 65,
                      }))
                    }
                    className="text-xs text-slate-500 hover:text-brand underline"
                  >
                    Kembali ke Foto Panggung
                  </button>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    <span>Intensitas Gelap Lapisan (Dark Overlay)</span>
                    <span className="font-mono text-brand font-black">{branding.login_bg_overlay}%</span>
                  </div>
                  <input
                    type="range"
                    min={30}
                    max={85}
                    step={5}
                    value={branding.login_bg_overlay}
                    onChange={(e) =>
                      setBranding((prev) => ({ ...prev, login_bg_overlay: Number(e.target.value) }))
                    }
                    className="w-full accent-brand cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Makin tinggi persentase, kartu login di tengah makin kontras dan nyaman dibaca.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bagian C: Teks Identitas Lembaga */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              3. Teks Judul Lembaga
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Aplikasi / Lembaga
                </label>
                <input
                  type="text"
                  required
                  value={branding.app_name}
                  onChange={(e) => setBranding((prev) => ({ ...prev, app_name: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 font-semibold focus:bg-white focus:border-brand focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Subjudul Aplikasi
                </label>
                <input
                  type="text"
                  required
                  value={branding.app_subtitle}
                  onChange={(e) => setBranding((prev) => ({ ...prev, app_subtitle: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 font-semibold focus:bg-white focus:border-brand focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Tombol Simpan Tab Branding */}
          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="submit"
              disabled={savingBranding}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-2.5 text-xs font-bold text-white hover:bg-brand-hover shadow-md transition disabled:opacity-60"
            >
              {savingBranding ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Menyimpan Pengaturan...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Simpan Perubahan Tampilan</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* =================================================================== */}
      {/* TAB 2: PENGGUNA & HAK AKSES                                        */}
      {/* =================================================================== */}
      {activeTab === "pengguna" && (
        <div className="space-y-6">
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

            <div className="flex items-center gap-3">
              <div className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-3">
                <span>Total: <strong className="text-slate-900 dark:text-white">{users.length}</strong></span>
                <span>Aktif: <strong className="text-emerald-600">{users.filter((u) => u.status === "active").length}</strong></span>
              </div>
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white hover:bg-brand-hover shadow-sm transition"
              >
                <UserPlus className="w-4 h-4" />
                <span>Tambah Pengguna</span>
              </button>
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
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: STANDAR KKM & TAHFIDZ                                       */}
      {/* =================================================================== */}
      {activeTab === "tahfidz" && (
        <form onSubmit={handleSaveBranding} className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-5 max-w-2xl">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Standar Akademik & Kriteria Penilaian Tahfidz
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Nilai yang ditentukan di sini langsung menjadi acuan otomatis pada seluruh modul ujian dan rekapitulasi.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Standar Nilai Kelulusan KKM Khotmil (15 & 30 Juz)
                </label>
                <input
                  type="number"
                  min={50}
                  max={100}
                  value={branding.kkm_khotmil}
                  onChange={(e) =>
                    setBranding((prev) => ({ ...prev, kkm_khotmil: Number(e.target.value) }))
                  }
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 font-bold focus:bg-white focus:border-brand focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  Nilai di bawah standar KKM ini otomatis dinyatakan &quot;Belum Tuntas / Remidi&quot;. (Default: 85)
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Target Setoran Bulanan per Santri (Juz)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min={0.5}
                  max={30}
                  value={branding.target_setoran}
                  onChange={(e) =>
                    setBranding((prev) => ({ ...prev, target_setoran: Number(e.target.value) }))
                  }
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 font-bold focus:bg-white focus:border-brand focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  Batas minimal pencapaian setoran bulanan untuk status hijau di modul Juz Baru & Evaluasi. (Default: 3 Juz)
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tahun Penilaian Aktif
                </label>
                <input
                  type="number"
                  min={2020}
                  max={2050}
                  value={branding.active_year}
                  onChange={(e) =>
                    setBranding((prev) => ({ ...prev, active_year: Number(e.target.value) }))
                  }
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 font-bold focus:bg-white focus:border-brand focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  Tahun yang otomatis aktif saat membuka halaman presensi dan setoran.
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="submit"
                disabled={savingBranding}
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2 text-xs font-bold text-white hover:bg-brand-hover shadow-sm transition disabled:opacity-60"
              >
                <Check className="w-4 h-4" />
                <span>Simpan Parameter Tahfidz</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* =================================================================== */}
      {/* TAB 4: HIERARKI KAMAR & ASRAMA                                     */}
      {/* =================================================================== */}
      {activeTab === "kamar" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4 max-w-2xl">
          <div className="flex items-center gap-2 text-brand font-bold text-xs uppercase tracking-wider">
            <Building className="w-4 h-4" />
            <span>Struktur Dropdown Kamar (Blok &gt; Asrama &gt; Kode &gt; Kamar)</span>
          </div>
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
            Konfigurasi Blok & Kamar Asrama Pondok
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Aturan ini mengatur hierarki pemilihan kamar santri agar penulisan kode kamar, nomor kamar (numerik 1-10 atau abjad), dan nama asrama terstandar tanpa terjadi inkonsistensi input.
          </p>

          <div className="pt-3">
            <button
              type="button"
              onClick={() => setHierarchyModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-hover shadow-sm transition"
            >
              <Building className="w-4 h-4" />
              <span>Buka Editor Hierarki Kamar & Asrama</span>
            </button>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 5: INTEGRASI WHATSAPP                                          */}
      {/* =================================================================== */}
      {activeTab === "waha" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-5 max-w-2xl">
          <div className="flex items-center gap-2 text-brand font-bold text-xs uppercase tracking-wider">
            <MessageSquare className="w-4 h-4" />
            <span>WhatsApp Gateway (WAHA Server)</span>
          </div>
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
            Pengaturan Notifikasi Otomatis WhatsApp
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Sistem terintegrasi dengan WhatsApp Gateway untuk pengiriman kartu ucapan kelulusan khatam santri serta pemberitahuan presensi ke wali santri.
          </p>

          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Server URL Endpoint
              </label>
              <input
                type="text"
                readOnly
                defaultValue="https://waha.blokagung.net"
                className="w-full rounded-xl border border-slate-300 bg-slate-100 px-3.5 py-2 text-xs text-slate-700 font-mono focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nama Sesi (Session ID)
              </label>
              <input
                type="text"
                readOnly
                defaultValue="default"
                className="w-full rounded-xl border border-slate-300 bg-slate-100 px-3.5 py-2 text-xs text-slate-700 font-mono focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              />
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>Untuk mengirim pesan massal dan kartu ucapan, buka menu <strong>Kirim WA</strong> pada bilah navigasi samping.</span>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 6: CADANGAN DATA (BACKUP)                                      */}
      {/* =================================================================== */}
      {activeTab === "backup" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-5 max-w-2xl">
          <div className="flex items-center gap-2 text-brand font-bold text-xs uppercase tracking-wider">
            <Database className="w-4 h-4" />
            <span>Pencadangan & Pemulihan Data</span>
          </div>
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
            Unduh Cadangan Database Santri & Nilai
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Disarankan mengunduh berkas cadangan data secara berkala untuk arsip tahunan atau sebelum melakukan perubahan besar pada data tahfidz.
          </p>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">
                Cadangan Data Santri & Hierarki
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Memuat seluruh data santri, kontak WA, kelas halaqoh, dan pemetaan kamar.
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                window.location.href = "/santri";
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 shadow-sm transition shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor Santri</span>
            </button>
          </div>
        </div>
      )}

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
                  disabled={submittingUser}
                  className="rounded-xl bg-brand px-5 py-2 text-xs font-bold text-white hover:bg-brand-hover shadow-sm transition disabled:opacity-60"
                >
                  {submittingUser ? "Menyimpan..." : isEditing ? "Simpan Perubahan" : "Buat Pengguna"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Pengguna */}
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
                disabled={deletingUser}
                onClick={handleDeleteUser}
                className="flex-1 rounded-xl bg-rose-600 py-2 text-xs font-bold text-white hover:bg-rose-700 shadow-sm transition disabled:opacity-60"
              >
                {deletingUser ? "Menghapus..." : "Ya, Hapus Akun"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Hierarki Kamar */}
      {hierarchyModalOpen && (
        <HierarchySettingsModal
          isOpen={hierarchyModalOpen}
          onClose={() => setHierarchyModalOpen(false)}
          rules={hierarchyRules}
          onSave={async (newRules) => {
            try {
              await saveHierarchyRules(newRules);
              setHierarchyRules(newRules);
              showToast("success", "Aturan hierarki kamar berhasil diperbarui.");
            } catch (err: any) {
              showToast("error", err?.message || "Gagal menyimpan hierarki.");
            }
          }}
        />
      )}
    </div>
  );
}

export default function PengaturanPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
        </div>
      }
    >
      <PengaturanContent />
    </Suspense>
  );
}
