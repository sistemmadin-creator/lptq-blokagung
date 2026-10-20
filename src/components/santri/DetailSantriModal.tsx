"use client";

import React from "react";
import {
  X,
  Pencil,
  Trash2,
  Phone,
  Building,
  DoorClosed,
  BookOpen,
  Calendar,
  MessageCircle,
  Hash,
  User,
  Layers,
} from "lucide-react";
import type { Santri } from "@/types/database";
import { HalaqohBadge } from "@/components/ui/Badges";
import { PEMETAAN_HALAQOH_KELAS } from "@/types/database";

interface DetailSantriModalProps {
  santri: Santri | null;
  onClose: () => void;
  onEdit: (santri: Santri) => void;
  onDelete: (santri: Santri) => void;
}

// Format nomor WhatsApp untuk tautan wa.me
function formatWhatsAppUrl(raw?: string | null): string | null {
  if (!raw) return null;
  let cleaned = raw.replace(/\D/g, "");
  if (!cleaned) return null;
  if (cleaned.startsWith("0")) {
    cleaned = "62" + cleaned.slice(1);
  } else if (!cleaned.startsWith("62")) {
    cleaned = "62" + cleaned;
  }
  return `https://wa.me/${cleaned}`;
}

export function DetailSantriModal({
  santri,
  onClose,
  onEdit,
  onDelete,
}: DetailSantriModalProps) {
  if (!santri) return null;

  const waUrl = formatWhatsAppUrl(santri.no_wa);
  const targetJuz = PEMETAAN_HALAQOH_KELAS[santri.halaqoh_kelas] || "-";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-detail-santri-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-emerald-800 text-white dark:border-slate-800 dark:bg-emerald-900">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white font-bold text-lg shadow-inner">
              {santri.nama_lengkap.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2
                id="modal-detail-santri-title"
                className="text-base font-bold leading-tight text-white"
              >
                {santri.nama_lengkap}
              </h2>
              <p className="text-xs text-emerald-100 font-mono">
                Kode: {santri.kode}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog detail"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-emerald-100 hover:bg-white/10 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Konten Detail */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Quick WA Action Banner jika ada no WA */}
          {santri.no_wa ? (
            <div className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200/80 p-3.5 dark:bg-emerald-950/40 dark:border-emerald-800/60">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
                  <Phone className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                    Nomor WhatsApp
                  </p>
                  <p className="text-sm font-bold font-mono text-emerald-800 dark:text-emerald-300">
                    {santri.no_wa}
                  </p>
                </div>
              </div>
              {waUrl && (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-800 transition"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  <span>Kirim Pesan</span>
                </a>
              )}
            </div>
          ) : (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-500 italic dark:bg-slate-800/40 dark:border-slate-800">
              Nomor WhatsApp belum tercatat. Anda dapat menambahkannya melalui tombol Edit Data di bawah.
            </div>
          )}

          {/* Kartu 1: Identitas Pokok */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 dark:border-slate-800 dark:bg-slate-800/50">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-emerald-600" />
              <span>Identitas Santri</span>
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Kode Unik</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-100">
                  {santri.kode}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Nama Lengkap</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">
                  {santri.nama_lengkap}
                </span>
              </div>
            </div>
          </div>

          {/* Kartu 2: Penempatan Kamar (Hierarki Dropdown: Blok > Asrama > Kode > Kamar) */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 dark:border-slate-800 dark:bg-slate-800/50">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Building className="h-3.5 w-3.5 text-emerald-600" />
              <span>Penempatan Domisili Kamar</span>
            </h3>

            {/* Jalur Breadcrumb Hierarki */}
            <div className="flex flex-wrap items-center gap-1.5 py-1 text-xs">
              <span className="rounded-md bg-emerald-50 text-emerald-800 px-2 py-0.5 font-bold border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                Blok {santri.blok}
              </span>
              <span className="text-slate-400 font-bold">&gt;</span>
              <span className="rounded-md bg-emerald-50 text-emerald-800 px-2 py-0.5 font-bold border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                Asrama {santri.asrama}
              </span>
              <span className="text-slate-400 font-bold">&gt;</span>
              <span className="rounded-md bg-emerald-50 text-emerald-800 px-2 py-0.5 font-bold border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                Kode {santri.kode_kamar || "-"}
              </span>
              <span className="text-slate-400 font-bold">&gt;</span>
              <span className="rounded-md bg-emerald-100 text-emerald-900 px-2 py-0.5 font-extrabold border border-emerald-300 dark:bg-emerald-900 dark:text-emerald-100">
                Kamar {santri.kamar}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 pt-2 text-xs border-t border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-slate-400 block mb-0.5">Blok</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">
                  {santri.blok}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Asrama</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">
                  {santri.asrama}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Kode</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">
                  {santri.kode_kamar || "-"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Kamar</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">
                  {santri.kamar}
                </span>
              </div>
            </div>
          </div>

          {/* Kartu 3: Halaqoh & Pembinaan Tahfidz */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 dark:border-slate-800 dark:bg-slate-800/50">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-emerald-600" />
              <span>Halaqoh & Target Tahfidz</span>
            </h3>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Halaqoh Kelas</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">
                  Kelas {santri.halaqoh_kelas}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Halaqoh Bagian</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">
                  Bagian {santri.halaqoh_bagian}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Target Juz</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400">
                  {targetJuz}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200 dark:bg-slate-800/80 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              onDelete(santri);
              onClose();
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-white px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 hover:border-rose-400 transition dark:bg-slate-900 dark:border-rose-900/60 dark:text-rose-400 dark:hover:bg-rose-950/40"
          >
            <Trash2 className="h-4 w-4" />
            <span>Hapus Data</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(santri);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-800 px-4 py-2 text-xs font-bold text-white shadow hover:bg-emerald-900 transition dark:bg-emerald-700 dark:hover:bg-emerald-800"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span>Edit Data</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
