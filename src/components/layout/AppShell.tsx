"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Users,
  CalendarCheck,
  BookOpen,
  ClipboardCheck,
  Award,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  Search,
  ShieldCheck,
  Pin,
  PinOff,
  ChevronRight,
  ChevronUp,
  GraduationCap,
  FileSpreadsheet,
  FileImage,
  MessageSquare,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { fetchCurrentUserProfile } from "@/lib/services/tahfidz-service";
import type { Profile } from "@/types/database";

interface NavItem {
  href: string;
  label: string;
  group: string;
  badge?: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", group: "Utama", icon: LayoutDashboard },
  { href: "/santri", label: "Data Santri Tahfidz", group: "Utama", icon: Users },
  { href: "/halaqoh", label: "Halaqoh", group: "Utama", icon: GraduationCap },
  {
    href: "/tahfidz/umum/kegiatan",
    label: "Kegiatan (Absensi)",
    group: "Tahfidz Umum",
    badge: "2x/Hari",
    icon: CalendarCheck,
  },
  {
    href: "/tahfidz/umum/juz-baru",
    label: "Juz Baru (Pembimbing)",
    group: "Tahfidz Umum",
    icon: BookOpen,
  },
  {
    href: "/tahfidz/umum/evaluasi",
    label: "Evaluasi (Pengurus)",
    group: "Tahfidz Umum",
    icon: ClipboardCheck,
  },
  {
    href: "/tahfidz/khotmil/15",
    label: "Khotmil 15 Juz",
    group: "Tahfidz Khotmil",
    badge: "5 Tahap",
    icon: Award,
  },
  {
    href: "/tahfidz/khotmil/30",
    label: "Khotmil 30 Juz",
    group: "Tahfidz Khotmil",
    badge: "9 Tahap",
    icon: Award,
  },
  {
    href: "/alat/flyer-khataman",
    label: "Flyer Khataman",
    group: "Alat Lanjutan",
    icon: FileImage,
  },
  {
    href: "/alat/kirim-wa",
    label: "Kirim WA",
    group: "Alat Lanjutan",
    icon: MessageSquare,
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [quickSearch, setQuickSearch] = useState("");

  // State untuk fitur Pin dan Auto-Collapse Sidebar Desktop
  const [isPinned, setIsPinned] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  // State untuk Dropdown Buka Rekap Khotmil (15 Juz & 30 Juz)
  const [rekapDropdownOpen, setRekapDropdownOpen] = useState(false);
  const rekapDropdownRef = useRef<HTMLDivElement>(null);

  const isLoginPage = pathname.startsWith("/login");

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        rekapDropdownRef.current &&
        !rekapDropdownRef.current.contains(e.target as Node)
      ) {
        setRekapDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setRekapDropdownOpen(false);
  }, [pathname]);

  useEffect(() => {
    const savedTheme = localStorage.getItem("lptq_theme");
    if (savedTheme === "dark") {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
    }

    const savedPin = localStorage.getItem("lptq_sidebar_pinned");
    if (savedPin === "true") {
      setIsPinned(true);
      setIsExpanded(true);
    }
  }, []);

  useEffect(() => {
    if (!isLoginPage) {
      fetchCurrentUserProfile()
        .then(setProfile)
        .catch(() => setProfile(null));
    }
  }, [isLoginPage, pathname]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen]);

  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("lptq_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("lptq_theme", "light");
    }
  };

  const togglePinSidebar = () => {
    const nextPin = !isPinned;
    setIsPinned(nextPin);
    localStorage.setItem("lptq_sidebar_pinned", String(nextPin));
    if (nextPin) {
      setIsExpanded(true);
    }
  };

  // Ketika menu diklik, sembunyikan sidebar ke mode ikon jika tidak di-pin
  const handleDesktopNavClick = () => {
    if (!isPinned) {
      setIsExpanded(false);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const handleQuickSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push("/santri");
  };

  if (isLoginPage) {
    return <main className="min-h-screen">{children}</main>;
  }

  const groups = ["Utama", "Tahfidz Umum", "Tahfidz Khotmil", "Alat Lanjutan"];
  const userInitial = (profile?.nama || profile?.email || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const sidebarOpen = isPinned || isExpanded;

  return (
    <div className="min-h-screen bg-[#f8f9fc] dark:bg-slate-950">
      {/* Sidebar Desktop: Fixed penuh dari atas ke bawah layar (tidak pernah terputus saat scroll) */}
      <aside
        onMouseEnter={() => {
          if (!isPinned) setIsExpanded(true);
        }}
        onMouseLeave={() => {
          if (!isPinned) setIsExpanded(false);
        }}
        className={`no-print no-scrollbar hidden lg:flex fixed inset-y-0 left-0 z-30 h-screen bg-gradient-to-b from-brand to-brand-darker text-white flex-col justify-between py-5 overflow-y-auto overflow-x-hidden shadow-lg transition-all duration-300 ease-in-out ${
          sidebarOpen ? "w-64 px-4" : "w-20 px-2.5"
        }`}
      >
        <div>
          {/* Header Brand + Tombol Pin Sidebar */}
          <div
            className={`flex items-center mb-6 ${
              sidebarOpen ? "justify-between px-1" : "justify-center"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                title={sidebarOpen ? "Ciutkan sidebar" : "Lebarkan sidebar"}
                aria-label={sidebarOpen ? "Ciutkan sidebar" : "Lebarkan sidebar"}
                className="w-11 h-11 rounded-xl bg-white text-brand-dark flex items-center justify-center font-extrabold text-xs shadow-sm shrink-0"
              >
                [LOGO]
              </button>
              {sidebarOpen && (
                <div className="min-w-0">
                  <h2 className="text-base font-extrabold tracking-tight leading-none text-white truncate">
                    Lptq Blokagung
                  </h2>
                  <span className="text-[10px] tracking-widest uppercase font-semibold text-emerald-100 block mt-1 truncate">
                    Sistem Tahfidz
                  </span>
                </div>
              )}
            </div>

            {sidebarOpen && (
              <button
                type="button"
                onClick={togglePinSidebar}
                title={
                  isPinned
                    ? "Lepas sematan agar sidebar otomatis bersembunyi"
                    : "Sematkan (Pin) agar sidebar tetap terbuka"
                }
                aria-label={
                  isPinned ? "Lepas sematan sidebar" : "Sematkan sidebar agar tetap terbuka"
                }
                aria-pressed={isPinned}
                className={`min-h-[38px] min-w-[38px] inline-flex items-center justify-center rounded-xl border transition shrink-0 ${
                  isPinned
                    ? "bg-white text-brand-dark border-white shadow-sm"
                    : "bg-white/10 text-emerald-100 border-white/15 hover:bg-white/20 hover:text-white"
                }`}
              >
                {isPinned ? (
                  <Pin className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <PinOff className="w-4 h-4" aria-hidden="true" />
                )}
              </button>
            )}
          </div>

          {/* Menu Navigasi */}
          <nav className="space-y-3" aria-label="Navigasi Utama">
            {groups.map((grp) => (
              <div key={grp}>
                {sidebarOpen ? (
                  <p className="px-3 mb-1 text-[10px] font-bold uppercase tracking-wider text-emerald-100/80 truncate">
                    {grp}
                  </p>
                ) : (
                  <div className="h-px bg-white/15 my-2 mx-2" aria-hidden="true" />
                )}

                <ul className="space-y-1">
                  {NAV_ITEMS.filter((i) => i.group === grp).map((item) => {
                    const Icon = item.icon;
                    const active =
                      item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={handleDesktopNavClick}
                          title={!sidebarOpen ? item.label : undefined}
                          aria-label={item.label}
                          className={`flex min-h-[44px] items-center rounded-xl transition-all duration-200 text-xs ${
                            sidebarOpen
                              ? "justify-between px-3 py-2.5"
                              : "justify-center px-0 py-2.5"
                          } ${
                            active
                              ? "bg-white text-brand-dark font-bold shadow-md"
                              : "text-emerald-50 hover:bg-white/10 hover:text-white font-medium"
                          }`}
                        >
                          <span
                            className={`flex items-center min-w-0 ${
                              sidebarOpen ? "gap-3" : "justify-center"
                            }`}
                          >
                            <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
                            {sidebarOpen && <span className="truncate">{item.label}</span>}
                          </span>

                          {sidebarOpen && item.badge && (
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap shrink-0 ml-2 ${
                                active
                                  ? "bg-emerald-100 text-brand-dark"
                                  : "bg-emerald-900/60 text-emerald-100"
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {/* Kartu Standar KKM di Bawah Sidebar (Menyesuaikan Mode Terbuka / Ikon) */}
        <div className="mt-4 relative" ref={rekapDropdownRef}>
          {/* Popover Dropdown Rekap Khotmil (15 Juz & 30 Juz) */}
          {rekapDropdownOpen && (
            <div
              className={`absolute z-50 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-150 ${
                sidebarOpen
                  ? "bottom-full left-0 right-0 mb-2 w-full"
                  : "left-full bottom-0 ml-3 w-64"
              }`}
            >
              <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Pilih Rekap Khotmil
                </span>
                <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.5 rounded">
                  KKM: 85
                </span>
              </div>
              <div className="space-y-1 pt-1.5">
                <Link
                  href="/tahfidz/khotmil/rekap/15"
                  onClick={() => {
                    setRekapDropdownOpen(false);
                    handleDesktopNavClick();
                  }}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-emerald-50 dark:hover:bg-slate-800 transition group text-slate-800 dark:text-slate-100"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center justify-center shrink-0">
                      <Award className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-emerald-800 dark:group-hover:text-emerald-400 truncate">
                        Rekap 15 Juz
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        5 Tahap • Nilai Sempurna • Remidi
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition shrink-0" />
                </Link>

                <Link
                  href="/tahfidz/khotmil/rekap/30"
                  onClick={() => {
                    setRekapDropdownOpen(false);
                    handleDesktopNavClick();
                  }}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-emerald-50 dark:hover:bg-slate-800 transition group text-slate-800 dark:text-slate-100"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center justify-center shrink-0">
                      <Award className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-emerald-800 dark:group-hover:text-emerald-400 truncate">
                        Rekap 30 Juz
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        9 Tahap • Nilai Sempurna • Remidi
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition shrink-0" />
                </Link>
              </div>
            </div>
          )}

          {sidebarOpen ? (
            <div className="bg-emerald-950/40 border border-white/15 rounded-2xl p-3.5 text-center">
              <div className="w-8 h-8 mx-auto rounded-full bg-white/15 flex items-center justify-center text-white mb-2">
                <ShieldCheck className="w-4 h-4 text-amber-300" aria-hidden="true" />
              </div>
              <p className="text-[11px] font-bold tracking-wider uppercase text-white mb-0.5">
                Standar KKM: 85
              </p>
              <p className="text-[11px] text-emerald-100 mb-2.5 leading-snug">
                Kelulusan Khotmil 15 & 30 Juz dihitung otomatis.
              </p>
              <button
                type="button"
                onClick={() => setRekapDropdownOpen((prev) => !prev)}
                aria-expanded={rekapDropdownOpen}
                aria-label="Buka Menu Dropdown Rekap Khotmil"
                className="inline-flex min-h-[38px] w-full items-center justify-center gap-1.5 py-1.5 bg-white text-brand-dark font-bold text-xs rounded-xl hover:bg-emerald-50 transition shadow-sm"
              >
                <span>Buka Rekap Khotmil</span>
                <ChevronUp
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    rekapDropdownOpen ? "rotate-180" : ""
                  }`}
                  aria-hidden="true"
                />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => setRekapDropdownOpen((prev) => !prev)}
                title="Standar KKM 85 - Buka Rekap Khotmil"
                aria-label="Standar KKM 85 - Buka Rekap Khotmil"
                aria-expanded={rekapDropdownOpen}
                className="w-11 h-11 rounded-xl bg-emerald-950/50 border border-white/15 flex items-center justify-center text-amber-300 hover:bg-white/15 transition relative"
              >
                <ShieldCheck className="w-5 h-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setIsExpanded(true)}
                title="Lebarkan sidebar"
                aria-label="Lebarkan sidebar"
                className="w-11 h-11 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
              >
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Area Konten Utama dengan animasi padding kiri mengikuti lebar sidebar */}
      <div
        className={`flex flex-col min-h-screen min-w-0 transition-all duration-300 ease-in-out ${
          sidebarOpen ? "lg:pl-64" : "lg:pl-20"
        }`}
      >
        {/* Top Header Bar */}
        <header className="no-print bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4 sticky top-0 z-20">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Buka menu navigasi"
              className="lg:hidden inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Menu className="h-4 w-4" aria-hidden="true" />
              <span>Menu</span>
            </button>

            <form onSubmit={handleQuickSearchSubmit} className="relative hidden sm:block w-full">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
                <Search className="w-4 h-4" aria-hidden="true" />
              </span>
              <input
                type="text"
                value={quickSearch}
                onChange={(e) => setQuickSearch(e.target.value)}
                placeholder="Cari santri, asrama, atau buka daftar santri..."
                aria-label="Pintasan ke pencarian santri"
                className="w-full min-h-[44px] pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition"
              />
            </form>
          </div>

          {/* Profil Pengguna, Toggle Tema, dan Tombol Keluar */}
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={darkMode ? "Ganti ke tema terang" : "Ganti ke tema gelap"}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            >
              {darkMode ? (
                <Sun className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Moon className="w-4 h-4" aria-hidden="true" />
              )}
            </button>

            <div className="hidden sm:block h-6 w-px bg-slate-200 dark:bg-slate-700" />

            {profile && (
              <div className="flex items-center gap-3">
                <div
                  aria-hidden="true"
                  className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-950 text-brand-dark dark:text-emerald-300 font-bold flex items-center justify-center text-xs border border-emerald-300 dark:border-emerald-700"
                >
                  {userInitial}
                </div>
                <div className="hidden md:block text-left">
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
                    {profile.nama || profile.email}
                  </div>
                  <div className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                    Peran: {profile.role.toUpperCase()}
                    {profile.halaqoh_kelas && profile.halaqoh_bagian
                      ? ` • Halaqoh ${profile.halaqoh_kelas}${profile.halaqoh_bagian}`
                      : ""}
                  </div>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-red-700 bg-red-50 px-3.5 py-2 text-xs font-bold text-red-900 hover:bg-red-100 dark:border-red-500 dark:bg-red-950 dark:text-red-200 transition"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span>Keluar</span>
            </button>
          </div>
        </header>

        {/* Drawer Navigasi Mobile */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-40 lg:hidden flex"
            role="dialog"
            aria-modal="true"
            aria-label="Menu Navigasi Mobile"
          >
            <div
              className="fixed inset-0 bg-slate-900/60"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="no-scrollbar relative z-50 flex w-72 max-w-[85vw] flex-col bg-gradient-to-b from-brand to-brand-darker text-white h-full shadow-xl p-5 overflow-y-auto">
              <div className="flex items-center justify-between pb-4 border-b border-white/15">
                <div className="flex items-center gap-2.5">
                  <span className="px-2 py-1 rounded-lg bg-white text-brand-dark text-xs font-extrabold">
                    [LOGO]
                  </span>
                  <span className="font-bold text-white">Lptq Blokagung</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Tutup menu navigasi"
                  className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-white/20 text-white"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <nav className="flex-1 py-4 space-y-4">
                {groups.map((grp) => (
                  <div key={grp}>
                    <p className="px-3 mb-1 text-[11px] font-bold uppercase tracking-wider text-emerald-100">
                      {grp}
                    </p>
                    <ul className="space-y-1">
                      {NAV_ITEMS.filter((i) => i.group === grp).map((item) => {
                        const Icon = item.icon;
                        const active =
                          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                        return (
                          <li key={item.href}>
                            <Link
                              href={item.href}
                              className={`flex min-h-[44px] items-center justify-between rounded-xl px-3.5 py-2.5 text-sm ${
                                active
                                  ? "bg-white text-brand-dark font-bold shadow"
                                  : "text-emerald-50 hover:bg-white/10 font-medium"
                              }`}
                            >
                              <span className="flex items-center gap-3">
                                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                                <span>{item.label}</span>
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </nav>

              <div className="pt-3 pb-4 border-t border-white/15">
                <p className="px-1 mb-2 text-[10px] font-bold uppercase tracking-wider text-emerald-200">
                  Rekapitulasi Khotmil
                </p>
                <div className="space-y-1.5">
                  <Link
                    href="/tahfidz/khotmil/rekap/15"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs text-white font-bold transition"
                  >
                    <span className="flex items-center gap-2">
                      <Award className="w-3.5 h-3.5 text-amber-300" />
                      <span>Rekap 15 Juz (5 Tahap)</span>
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-emerald-200" />
                  </Link>
                  <Link
                    href="/tahfidz/khotmil/rekap/30"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs text-white font-bold transition"
                  >
                    <span className="flex items-center gap-2">
                      <Award className="w-3.5 h-3.5 text-amber-300" />
                      <span>Rekap 30 Juz (9 Tahap)</span>
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-emerald-200" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Konten Halaman */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full">{children}</main>

        {/* Global Footer */}
        <footer className="no-print mt-auto border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 sm:px-8 py-4 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 dark:text-slate-400 gap-3">
          <div>
            &copy; {new Date().getFullYear()} LPTQ Pondok Pesantren Darussalam Blokagung. Sistem
            Penilaian Tahfidz Santri.
          </div>
          <div className="flex flex-wrap items-center gap-5 font-medium">
            <Link href="/santri" className="hover:text-brand-dark dark:hover:text-emerald-400">
              Data Santri
            </Link>
            <Link
              href="/tahfidz/umum/kegiatan"
              className="hover:text-brand-dark dark:hover:text-emerald-400"
            >
              Absensi Harian
            </Link>
            <Link
              href="/tahfidz/khotmil/15"
              className="hover:text-brand-dark dark:hover:text-emerald-400"
            >
              Khotmil 15 Juz
            </Link>
            <Link
              href="/tahfidz/khotmil/30"
              className="hover:text-brand-dark dark:hover:text-emerald-400"
            >
              Khotmil 30 Juz
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
