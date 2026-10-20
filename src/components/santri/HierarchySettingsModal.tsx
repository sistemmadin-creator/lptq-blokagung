"use client";

import React, { useState, useId } from "react";
import {
  X,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  RotateCcw,
  FolderOpen,
  Save,
  Check,
} from "lucide-react";
import type { HierarchyRule } from "@/lib/services/hierarchy-service";

interface HierarchySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  rules: HierarchyRule[];
  onSave: (rules: HierarchyRule[]) => Promise<void>;
}

export function HierarchySettingsModal({
  isOpen,
  onClose,
  rules: initialRules,
  onSave,
}: HierarchySettingsModalProps) {
  const [rules, setRules] = useState<HierarchyRule[]>(initialRules);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBlok, setFilterBlok] = useState("");
  const [filterAsrama, setFilterAsrama] = useState("");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [saving, setSaving] = useState(false);

  // Sinkronkan state saat props berubah atau modal dibuka
  React.useEffect(() => {
    setRules(initialRules);
  }, [initialRules, isOpen]);

  if (!isOpen) return null;

  // Ekstrak daftar blok dan asrama unik untuk filter
  const blokSet = new Set<string>();
  const asramaSet = new Set<string>();

  rules.forEach((r) => {
    const parts = (r.parentPath || "").split(">").map((s) => s.trim()).filter(Boolean);
    if (parts[0]) blokSet.add(parts[0]);
    if (parts[1] && (!filterBlok || parts[0] === filterBlok)) {
      asramaSet.add(parts[1]);
    }
  });

  // Filter aturan berdasarkan search & filter blok/asrama
  const filteredRules = rules.filter((r) => {
    const parts = (r.parentPath || "").split(">").map((s) => s.trim()).filter(Boolean);
    const blok = parts[0] || "";
    const asrama = parts[1] || "";
    const fullText = `${r.parentPath} ${r.type} ${r.numStart || ""} ${r.numEnd || ""} ${r.alphaStart || ""} ${r.alphaEnd || ""} ${r.manualList || ""}`.toLowerCase();

    const matchBlok = !filterBlok || blok === filterBlok;
    const matchAsrama = !filterAsrama || asrama === filterAsrama;
    const matchSearch = !searchTerm || fullText.includes(searchTerm.toLowerCase().trim());

    return matchBlok && matchAsrama && matchSearch;
  });

  const handleAddRule = () => {
    const newId = `rule_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newRule: HierarchyRule = {
      id: newId,
      tree: "tree1",
      parentPath: "Blok 1 > Al Hikmah > E",
      type: "numeric",
      numStart: 1,
      numEnd: 10,
    };
    setRules((prev) => [newRule, ...prev]);
    setExpandedId(newId);
  };

  const handleRemoveRule = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  const handleUpdateRule = (id: string, updates: Partial<HierarchyRule>) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(rules);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const getRangePreview = (r: HierarchyRule) => {
    if (r.type === "numeric") {
      return `[ ${r.numStart || 1} - ${r.numEnd || 10} ]`;
    }
    if (r.type === "alpha") {
      return `[ ${(r.alphaStart || "A").toUpperCase()} - ${(r.alphaEnd || "E").toUpperCase()} ]`;
    }
    return `[ ${r.manualList || "Manual"} ]`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-settings-title"
    >
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white dark:bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <FolderOpen className="h-4 w-4" />
            </div>
            <div>
              <h2 id="modal-settings-title" className="text-base font-bold text-white">
                Pengaturan Hierarki Dropdown
              </h2>
              <p className="text-xs text-slate-400">
                Atur relasi Blok &gt; Asrama &gt; Kode &gt; Kamar untuk form santri
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup pengaturan hierarki"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Konten Builder Hierarki */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 bg-slate-50 dark:bg-slate-900/50">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-800/60">
            {/* Toolbar Builder */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400">
                1. Blok &gt; Asrama &gt; Kode &gt; Kamar
              </span>

              <div className="flex items-center gap-1.5 ms-auto">
                {/* Tombol Filter Blok/Asrama */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowFilterDropdown((prev) => !prev)}
                    className={`inline-flex items-center gap-1 h-8 rounded-lg border px-2.5 text-xs font-semibold shadow-sm transition ${
                      filterBlok || filterAsrama
                        ? "border-emerald-600 bg-emerald-50 text-emerald-800 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    }`}
                  >
                    <Filter className="h-3.5 w-3.5" />
                    <span>Filter</span>
                  </button>

                  {showFilterDropdown && (
                    <div className="absolute right-0 mt-1 z-30 w-56 rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900 space-y-2.5">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          Blok
                        </label>
                        <select
                          value={filterBlok}
                          onChange={(e) => {
                            setFilterBlok(e.target.value);
                            setFilterAsrama("");
                          }}
                          className="w-full h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        >
                          <option value="">Semua Blok</option>
                          {Array.from(blokSet).map((b) => (
                            <option key={b} value={b}>
                              {b}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          Asrama
                        </label>
                        <select
                          value={filterAsrama}
                          onChange={(e) => setFilterAsrama(e.target.value)}
                          className="w-full h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        >
                          <option value="">Semua Asrama</option>
                          {Array.from(asramaSet).map((a) => (
                            <option key={a} value={a}>
                              {a}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setFilterBlok("");
                          setFilterAsrama("");
                          setShowFilterDropdown(false);
                        }}
                        className="w-full inline-flex items-center justify-center gap-1 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg dark:text-slate-400 dark:hover:bg-slate-800"
                      >
                        <RotateCcw className="h-3 w-3" />
                        <span>Reset Filter</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Kotak Pencarian Aturan */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Cari aturan..."
                    className="h-8 w-32 sm:w-40 rounded-lg border border-slate-300 bg-white pl-8 pr-2 text-xs text-slate-800 placeholder-slate-400 shadow-sm focus:border-emerald-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>

                {/* Tombol Tambah Aturan (+) */}
                <button
                  type="button"
                  onClick={handleAddRule}
                  title="Tambah Aturan Baru"
                  aria-label="Tambah Aturan Baru"
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-700 text-white shadow-sm hover:bg-emerald-800 transition"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Daftar Baris Aturan (Accordion) */}
            <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
              {filteredRules.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 italic">
                  Tidak ada aturan hierarki yang cocok. Klik tombol (+) untuk menambah.
                </div>
              ) : (
                filteredRules.map((rule) => {
                  const isExpanded = expandedId === rule.id;

                  return (
                    <div
                      key={rule.id}
                      className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-700/80 dark:bg-slate-800"
                    >
                      {/* Baris Ringkasan (Preview) */}
                      <div
                        onClick={() =>
                          setExpandedId(isExpanded ? null : rule.id)
                        }
                        className="flex items-center justify-between px-3.5 py-2.5 cursor-pointer hover:bg-slate-50 transition dark:hover:bg-slate-700/50"
                      >
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-800 dark:text-slate-200 truncate pr-2">
                          <FolderOpen className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span className="font-semibold text-slate-900 dark:text-white truncate">
                            {rule.parentPath || "Rute Kosong"}
                          </span>
                          <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-mono text-slate-600 border border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600">
                            {getRangePreview(rule)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => handleRemoveRule(rule.id, e)}
                            title="Hapus Aturan"
                            aria-label="Hapus Aturan"
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition dark:hover:bg-rose-950/40"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-slate-400" />
                          )}
                        </div>
                      </div>

                      {/* Detail Edit (Saat Terbuka) */}
                      {isExpanded && (
                        <div className="p-3.5 bg-slate-50/80 border-t border-slate-100 dark:bg-slate-900/60 dark:border-slate-700 space-y-3">
                          <div>
                            <label className="block text-[11px] font-bold text-emerald-800 dark:text-emerald-400 mb-1">
                              Rute Induk Pengelompokan (Blok &gt; Asrama &gt; Kode)
                            </label>
                            <input
                              type="text"
                              value={rule.parentPath}
                              onChange={(e) =>
                                handleUpdateRule(rule.id, {
                                  parentPath: e.target.value,
                                })
                              }
                              placeholder="Contoh: Blok 1 > Al Hikmah > E"
                              className="w-full h-8 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-mono text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <div>
                              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                                Tipe Hasil Kamar
                              </label>
                              <select
                                value={rule.type}
                                onChange={(e) =>
                                  handleUpdateRule(rule.id, {
                                    type: e.target.value as HierarchyRule["type"],
                                  })
                                }
                                className="w-full h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                              >
                                <option value="numeric">Rentang Angka</option>
                                <option value="alpha">Rentang Abjad</option>
                                <option value="manual">Teks Manual</option>
                              </select>
                            </div>

                            {rule.type === "numeric" && (
                              <>
                                <div>
                                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                                    Angka Awal
                                  </label>
                                  <input
                                    type="number"
                                    value={rule.numStart || 1}
                                    onChange={(e) =>
                                      handleUpdateRule(rule.id, {
                                        numStart: Number(e.target.value),
                                      })
                                    }
                                    className="w-full h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                                    Angka Akhir
                                  </label>
                                  <input
                                    type="number"
                                    value={rule.numEnd || 10}
                                    onChange={(e) =>
                                      handleUpdateRule(rule.id, {
                                        numEnd: Number(e.target.value),
                                      })
                                    }
                                    className="w-full h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                  />
                                </div>
                              </>
                            )}

                            {rule.type === "alpha" && (
                              <>
                                <div>
                                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                                    Abjad Awal
                                  </label>
                                  <input
                                    type="text"
                                    maxLength={1}
                                    value={rule.alphaStart || "A"}
                                    onChange={(e) =>
                                      handleUpdateRule(rule.id, {
                                        alphaStart: e.target.value.toUpperCase(),
                                      })
                                    }
                                    className="w-full h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs text-center font-bold text-slate-800 uppercase dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                                    Abjad Akhir
                                  </label>
                                  <input
                                    type="text"
                                    maxLength={1}
                                    value={rule.alphaEnd || "E"}
                                    onChange={(e) =>
                                      handleUpdateRule(rule.id, {
                                        alphaEnd: e.target.value.toUpperCase(),
                                      })
                                    }
                                    className="w-full h-8 rounded-lg border border-slate-300 bg-white px-2 text-center text-xs font-bold text-slate-800 uppercase dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                  />
                                </div>
                              </>
                            )}

                            {rule.type === "manual" && (
                              <div className="sm:col-span-2">
                                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                                  Daftar Kamar (Pisahkan dengan koma)
                                </label>
                                <input
                                  type="text"
                                  value={rule.manualList || ""}
                                  onChange={(e) =>
                                    handleUpdateRule(rule.id, {
                                      manualList: e.target.value,
                                    })
                                  }
                                  placeholder="Contoh: A1, A2, A3, Mandi"
                                  className="w-full h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs font-mono text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer Simpan */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-t border-slate-200 dark:bg-slate-900 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white shadow hover:bg-black transition disabled:opacity-50 dark:bg-emerald-700 dark:hover:bg-emerald-800"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{saving ? "Menyimpan..." : "Simpan Pengaturan"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
