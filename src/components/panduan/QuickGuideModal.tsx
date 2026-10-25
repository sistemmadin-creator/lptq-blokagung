"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  BookOpen,
  Search,
  X,
  ExternalLink,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  Play,
  Lightbulb,
  Compass,
  FileText,
  Bookmark,
  Layers,
} from "lucide-react";
import {
  getContextualGuideByPath,
  searchPanduan,
  type ContextualGuide,
  type GuideSearchItem,
} from "@/lib/constants/panduan-contextual-data";

interface QuickGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QuickGuideModal({ isOpen, onClose }: QuickGuideModalProps) {
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Ambil panduan kontekstual spesifik untuk halaman aktif saat ini
  const contextualGuide: ContextualGuide = useMemo(() => {
    return getContextualGuideByPath(pathname, searchParams);
  }, [pathname, searchParams]);

  // Hasil pencarian live search
  const searchResults: GuideSearchItem[] = useMemo(() => {
    return searchPanduan(searchQuery);
  }, [searchQuery]);

  // Fokus otomatis ke input pencarian saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    } else {
      setSearchQuery("");
    }
  }, [isOpen]);

  // Listener tombol keyboard Escape untuk menutup modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pusat Panduan dan Bantuan Sistem LPTQ"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-in fade-in"
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ==================== HEADER MODAL ==================== */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/60 dark:bg-slate-800/40">
          <div className="flex items-center gap-3 min-w-0">
            <span className="p-2 sm:p-2.5 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 shadow-sm shrink-0">
              <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight leading-snug truncate">
                  Pusat Panduan &amp; Bantuan LPTQ
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold uppercase tracking-wider">
                  Otomatis Sesuai Halaman
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                Panduan otomatis mendeteksi modul yang sedang Anda buka:{" "}
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                  {contextualGuide.pageTitle}
                </span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup jendela panduan"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ==================== KOTAK PENCARIAN KHUSUS PANDUAN ==================== */}
        <div className="px-5 sm:px-6 pt-4 pb-2 border-b border-slate-100 dark:border-slate-800/60 bg-white dark:bg-slate-900">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-emerald-600 dark:text-emerald-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari topik panduan... (misal: excel, kkm, omr, wa gateway, flyer, retensi)"
              className="w-full pl-10 pr-9 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Hapus kata kunci pencarian"
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="mt-1.5 text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
            <span>Pencarian menyaring seluruh 9 BAB buku panduan dan simulator interaktif secara seketika.</span>
          </p>
        </div>

        {/* ==================== ISI MODAL (SCROLLABLE BODY) ==================== */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {/* JIKA ADA PENCARIAN AKTIF: TAMPILKAN HASIL SEARCH */}
          {searchQuery.trim() ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>
                  Hasil Pencarian untuk &quot;<span className="text-emerald-600 dark:text-emerald-400">{searchQuery}</span>&quot;
                </span>
                <span className="text-[11px] font-normal text-slate-500">
                  {searchResults.length} hasil ditemukan
                </span>
              </div>

              {searchResults.length === 0 ? (
                <div className="py-10 text-center space-y-2">
                  <HelpCircle className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400">
                    Tidak ditemukan topik panduan yang cocok dengan kata kunci tersebut.
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    Coba gunakan kata kunci umum lainnya seperti: <strong>excel, kkm, wa, rapor, foto, santri, halaqoh, omr, absen</strong>.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="mt-2 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100 transition"
                  >
                    Kembali ke Panduan Halaman Ini
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5">
                  {searchResults.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        onClose();
                        router.push(item.url);
                        if (typeof window !== "undefined" && item.url.includes("#")) {
                          const targetHash = item.url.split("#")[1];
                          if (window.location.pathname.includes("/pengaturan")) {
                            window.location.hash = targetHash;
                          }
                        }
                      }}
                      className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 hover:bg-emerald-50/60 dark:bg-slate-800/40 dark:hover:bg-emerald-950/30 transition cursor-pointer group flex items-start gap-3"
                    >
                      <span className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-emerald-700 dark:text-emerald-300 group-hover:scale-105 transition shrink-0 mt-0.5">
                        {item.type === "tour" ? (
                          <Play className="w-4 h-4 text-amber-500" />
                        ) : (
                          <BookOpen className="w-4 h-4 text-emerald-600" />
                        )}
                      </span>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold uppercase">
                            {item.chapter}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {item.category}
                          </span>
                        </div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition">
                          {item.title}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                          {item.snippet}
                        </p>
                      </div>

                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:translate-x-1 transition shrink-0 mt-2" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* JIKA TIDAK ADA PENCARIAN: TAMPILKAN PANDUAN SPESIFIK HALAMAN AKTIF */
            <div className="space-y-5">
              {/* KARTU PANDUAN KONTEKSTUAL UTAMA */}
              <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-gradient-to-br from-emerald-50/70 via-teal-50/40 to-white dark:from-emerald-950/30 dark:via-slate-900 dark:to-slate-900 p-5 shadow-sm space-y-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-extrabold uppercase tracking-wider shadow-sm">
                        📍 Panduan Halaman Ini
                      </span>
                      <span className="text-[11px] font-mono text-emerald-800 dark:text-emerald-300 font-bold">
                        {pathname}
                      </span>
                    </div>
                    <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 leading-snug">
                      {contextualGuide.pageTitle}
                    </h4>
                    <p className="text-xs text-emerald-800 dark:text-emerald-300 font-semibold mt-0.5">
                      Rujukan Dokumen: {contextualGuide.chapter}
                    </p>
                  </div>

                  <span className="px-2.5 py-1 rounded-xl bg-white/80 dark:bg-slate-800 border border-emerald-200 dark:border-emerald-700/60 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 shadow-sm shrink-0">
                    {contextualGuide.category}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-white/80 dark:bg-slate-800/80 p-3.5 rounded-xl border border-emerald-100 dark:border-slate-700/60 shadow-sm">
                  {contextualGuide.summary}
                </p>

                {/* LANGKAH-LANGKAH OPERASIONAL SPESIFIK */}
                <div className="space-y-2 pt-1">
                  <h5 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Langkah-Langkah Penggunaan di Halaman Ini:</span>
                  </h5>
                  <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-white/60 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/50">
                    {contextualGuide.steps.map((step, idx) => (
                      <li key={idx} className="pl-1">
                        <span className="font-normal">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* FITUR-FITUR PENTING */}
                {contextualGuide.keyFeatures && contextualGuide.keyFeatures.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <h5 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-emerald-600" />
                      <span>Fitur Kunci &amp; Tombol Penting:</span>
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {contextualGuide.keyFeatures.map((feat, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 space-y-0.5"
                        >
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                            {feat.title}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                            {feat.desc}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TIPS & CATATAN PENTING */}
                {contextualGuide.tips && contextualGuide.tips.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                      <Lightbulb className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Tips Operasional Halaman Ini:</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-[11px] pl-1 text-amber-950 dark:text-amber-200">
                      {contextualGuide.tips.map((tip, idx) => (
                        <li key={idx}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* TOMBOL AKSI PANDUAN */}
                <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2 border-t border-emerald-200/80 dark:border-emerald-800/60">
                  {contextualGuide.tourUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        router.push(contextualGuide.tourUrl!);
                      }}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition shadow-sm"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Buka Simulasi Interaktif Modul Ini</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      router.push(contextualGuide.fullGuideUrl);
                    }}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-sm"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Baca Bab Lengkap di Buku Panduan</span>
                  </button>
                </div>
              </div>

              {/* JELAJAHI CEPAT 9 BAB BUKU PANDUAN */}
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-brand-dark dark:text-emerald-400" />
                    <span>Jelajahi Cepat 9 Bab Buku Panduan:</span>
                  </h5>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      router.push("/pengaturan?tab=panduan");
                    }}
                    className="text-[11px] text-emerald-700 dark:text-emerald-400 hover:underline font-bold"
                  >
                    Buka Buku Penuh &rarr;
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  {[
                    { num: "BAB 1", name: "Pendahuluan & Arsitektur", hash: "bab-1" },
                    { num: "BAB 2", name: "Akses & Navigasi", hash: "bab-2" },
                    { num: "BAB 3", name: "Data Santri Tahfidz", hash: "bab-3" },
                    { num: "BAB 4", name: "Manajemen Halaqoh", hash: "bab-4" },
                    { num: "BAB 5", name: "Tahfidz Umum & Setoran", hash: "bab-5" },
                    { num: "BAB 6", name: "Khotmil 15/30 & OMR", hash: "bab-6" },
                    { num: "BAB 7", name: "Flyer & WA Gateway", hash: "bab-7" },
                    { num: "BAB 8", name: "Pengaturan & Log 6 Bln", hash: "bab-8" },
                    { num: "BAB 9", name: "Standar SOP Pesantren", hash: "bab-9" },
                  ].map((bab) => (
                    <button
                      key={bab.num}
                      type="button"
                      onClick={() => {
                        onClose();
                        router.push(`/pengaturan?tab=panduan&bab=${bab.hash}#${bab.hash}`);
                        if (typeof window !== "undefined" && window.location.pathname.includes("/pengaturan")) {
                          window.location.hash = bab.hash;
                        }
                      }}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-left transition group"
                    >
                      <span className="font-extrabold text-[10px] text-emerald-700 dark:text-emerald-400 block group-hover:underline">
                        {bab.num}
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 text-[11px] truncate block">
                        {bab.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ==================== FOOTER MODAL ==================== */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center sm:text-left">
            💡 <strong>Pintasan:</strong> Tekan <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-700 border font-mono">F1</kbd> atau klik profil di bar atas kapan saja untuk membuka panduan ini.
          </p>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 font-bold transition shadow-sm"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
