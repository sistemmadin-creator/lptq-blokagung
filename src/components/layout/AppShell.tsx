"use client";

import React, { useEffect, useState } from "react";
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
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [quickSearch, setQuickSearch] = useState("");

  const isLoginPage = pathname.startsWith("/login");

  useEffect(() => {
    const savedTheme = localStorage.getItem("lptq_theme");
    if (savedTheme === "dark") {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
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

  const groups = ["Utama", "Tahfidz Umum", "Tahfidz Khotmil"];
  const userInitial = (profile?.nama || profile?.email || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen flex flex-col lg:flex-row overflow-x-hidden bg-[#f8f9fc] dark:bg-slate-950">
      {/* Sidebar Desktop Bergaya Koki dengan Identitas Pesantren */}
      <aside className="no-print hidden lg:flex lg:w-64 bg-gradient-to-b from-brand to-brand-darker text-white flex-col justify-between p-6 shrink-0 min-h-screen sticky top-0 h-screen overflow-y-auto">
        <div>
          {/* Identitas Brand */}
          <div className="flex items-center gap-3 mb-8 px-1">
            <div className="w-10 h-10 rounded-xl bg-white text-brand-dark flex items-center justify-center font-extrabold text-sm shadow-sm shrink-0">
              [LOGO]
            </div>
            <div>
              <h2 className="text-lg font-extrabold tracking-tight leading-none text-white">
                Lptq Blokagung
              </h2>
              <span className="text-[10px] tracking-widest uppercase font-semibold text-emerald-100 block mt-1">
                Sistem Tahfidz
              </span>
            </div>
          </div>

          {/* Menu Navigasi */}
          <nav className="space-y-4" aria-label="Navigasi Utama">
            {groups.map((grp) => (
              <div key={grp}>
                <p className="px-3 mb-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-100/90">
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
                          className={`flex min-h-[44px] items-center justify-between px-3.5 py-2.5 rounded-xl transition-colors text-sm ${
                            active
                              ? "bg-white text-brand-dark font-bold shadow-md"
                              : "text-emerald-50 hover:bg-white/10 hover:text-white font-medium"
                          }`}
                        >
                          <span className="flex items-center gap-3">
                            <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                            <span>{item.label}</span>
                          </span>
                          {item.badge && (
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
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

        {/* Kartu Informasi Standar KKM & Role di Bawah Sidebar */}
        <div className="bg-emerald-950/40 border border-white/15 rounded-2xl p-4 text-center mt-6">
          <div className="w-9 h-9 mx-auto rounded-full bg-white/15 flex items-center justify-center text-white mb-2.5">
            <ShieldCheck className="w-5 h-5 text-amber-300" aria-hidden="true" />
          </div>
          <p className="text-xs font-bold tracking-wider uppercase text-white mb-1">
            Standar KKM: 85
          </p>
          <p className="text-[11px] text-emerald-100 mb-3 leading-relaxed">
            Kelulusan Khotmil 15 & 30 Juz dihitung otomatis dari rata-rata seluruh juz dalam tahap.
          </p>
          <Link
            href="/tahfidz/khotmil/15"
            className="inline-flex min-h-[40px] w-full items-center justify-center py-2 bg-white text-brand-dark font-bold text-xs rounded-xl hover:bg-emerald-50 transition shadow-sm"
          >
            Buka Rekap Khotmil
          </Link>
        </div>
      </aside>

      {/* Area Konten Utama */}
      <div className="flex-1 flex flex-col min-w-0">
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
            <div className="relative z-50 flex w-72 max-w-[85vw] flex-col bg-gradient-to-b from-brand to-brand-darker text-white h-full shadow-xl p-5">
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

              <nav className="flex-1 overflow-y-auto py-4 space-y-4">
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
            </div>
          </div>
        )}

        {/* Konten Halaman */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full">{children}</main>

        {/* Global Footer dengan Tautan Modul Nyata */}
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
