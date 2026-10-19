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
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { fetchCurrentUserProfile } from "@/lib/services/tahfidz-service";
import type { Profile } from "@/types/database";

interface NavItem {
  href: string;
  label: string;
  group: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Ringkasan Penilaian", group: "Utama", icon: LayoutDashboard },
  { href: "/santri", label: "Data Santri Tahfidz", group: "Utama", icon: Users },
  {
    href: "/tahfidz/umum/kegiatan",
    label: "Kegiatan (Absensi)",
    group: "Tahfidz Umum",
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
    label: "Evaluasi (Pengurus Pusat)",
    group: "Tahfidz Umum",
    icon: ClipboardCheck,
  },
  {
    href: "/tahfidz/khotmil/15",
    label: "Khotmil 15 Juz (Tahap 1-5)",
    group: "Tahfidz Khotmil",
    icon: Award,
  },
  {
    href: "/tahfidz/khotmil/30",
    label: "Khotmil 30 Juz (Tahap 1-9)",
    group: "Tahfidz Khotmil",
    icon: Award,
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

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

  if (isLoginPage) {
    return <main className="min-h-screen">{children}</main>;
  }

  const groups = ["Utama", "Tahfidz Umum", "Tahfidz Khotmil"];
  const userInitial = (profile?.nama || profile?.email || "U").charAt(0).toUpperCase();

  return (
    <div className="min-h-screen flex flex-col lg:flex-row overflow-x-hidden">
      {/* Sidebar Desktop */}
      <aside className="no-print hidden lg:flex lg:w-64 lg:flex-col lg:shrink-0 border-r border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-9 px-2 items-center justify-center rounded bg-emerald-800 text-xs font-bold tracking-wider text-white">
              [LOGO]
            </span>
            <div>
              <p className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                Lptq Blokagung
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Sistem Penilaian Tahfidz
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-5" aria-label="Navigasi Utama">
          {groups.map((grp) => (
            <div key={grp}>
              <p className="px-3 mb-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
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
                        className={`flex min-h-[44px] items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                          active
                            ? "bg-emerald-800 text-white"
                            : "text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      {/* Area Konten Utama */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="no-print sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-slate-300 bg-white px-4 lg:px-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Buka menu navigasi"
              className="lg:hidden inline-flex min-h-[44px] items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              <Menu className="h-4 w-4" />
              <span>Menu</span>
            </button>
            <span className="font-bold text-slate-900 dark:text-white lg:hidden">
              Lptq Blokagung
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={darkMode ? "Ganti ke tema terang" : "Ganti ke tema gelap"}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-slate-300 bg-white px-2.5 text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {profile && (
              <div className="flex items-center gap-2.5">
                <span
                  aria-hidden="true"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-800 text-xs font-bold text-white"
                >
                  {userInitial}
                </span>
                <div className="hidden sm:block text-right">
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {profile.nama || profile.email}
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Peran: {profile.role}
                    {profile.halaqoh_kelas && profile.halaqoh_bagian
                      ? ` (Halaqoh ${profile.halaqoh_kelas}${profile.halaqoh_bagian})`
                      : ""}
                  </p>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-md border border-red-700 bg-red-50 px-3 py-2 text-xs font-semibold text-red-900 hover:bg-red-100 dark:border-red-500 dark:bg-red-950 dark:text-red-200"
            >
              <LogOut className="h-4 w-4" />
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
            <div className="relative z-50 flex w-72 max-w-[85vw] flex-col bg-white dark:bg-slate-900 h-full shadow-xl">
              <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
                <span className="font-bold text-slate-900 dark:text-white">Lptq Blokagung</span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Tutup menu navigasi"
                  className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-slate-300 dark:border-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto p-3 space-y-4">
                {groups.map((grp) => (
                  <div key={grp}>
                    <p className="px-3 mb-1 text-xs font-semibold text-slate-600 dark:text-slate-400">
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
                              className={`flex min-h-[44px] items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium ${
                                active
                                  ? "bg-emerald-800 text-white"
                                  : "text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                              }`}
                            >
                              <Icon className="h-4 w-4 shrink-0" />
                              <span>{item.label}</span>
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

        <main className="flex-1 p-4 sm:p-6 max-w-full">{children}</main>
      </div>
    </div>
  );
}
