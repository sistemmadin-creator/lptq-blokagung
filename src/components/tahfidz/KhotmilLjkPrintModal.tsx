"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Printer,
  CheckSquare,
  Square,
  FileText,
  Loader2,
  Info,
} from "lucide-react";
import { useReactToPrint } from "react-to-print";
import { Santri, TahapConfig, JenisKhotmil } from "@/types/database";
import { encodeKhotmilQrPayload } from "@/lib/omr/khotmil-omr-types";
import { generateQrDataUrl } from "@/lib/omr/qr-helper";

interface KhotmilLjkPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  santriList: Santri[];
  currentTahapCfg: TahapConfig;
  jenis: JenisKhotmil;
  judul: string;
}

interface SantriQrMap {
  [santriId: string]: string; // data URL of the QR code
}

export function KhotmilLjkPrintModal({
  isOpen,
  onClose,
  santriList,
  currentTahapCfg,
  jenis,
  judul,
}: KhotmilLjkPrintModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [qrMap, setQrMap] = useState<SantriQrMap>({});
  const [generatingQr, setGeneratingQr] = useState(false);

  // Default pilih semua santri saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      const allIds = new Set(santriList.map((s) => s.id));
      setSelectedIds(allIds);
    }
  }, [isOpen, santriList]);

  // Generate QR Code untuk setiap santri yang dipilih
  useEffect(() => {
    if (!isOpen || selectedIds.size === 0) return;

    let active = true;
    setGeneratingQr(true);

    const generateAll = async () => {
      const newMap: SantriQrMap = {};
      const targetSantri = santriList.filter((s) => selectedIds.has(s.id));

      for (const s of targetSantri) {
        const payload = encodeKhotmilQrPayload({
          prefix: "LPTQ",
          jenis,
          tahap: currentTahapCfg.tahap,
          santriId: s.id,
          kode: s.kode || "",
          nama: s.nama_lengkap,
          juzList: currentTahapCfg.juzList,
        });

        const dataUrl = await generateQrDataUrl(payload);
        if (active) {
          newMap[s.id] = dataUrl;
        }
      }

      if (active) {
        setQrMap(newMap);
        setGeneratingQr(false);
      }
    };

    generateAll();

    return () => {
      active = false;
    };
  }, [isOpen, selectedIds, santriList, jenis, currentTahapCfg]);

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `LJK_${jenis}_Tahap_${currentTahapCfg.tahap}`,
  });

  const toggleSelectAll = () => {
    if (selectedIds.size === santriList.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(santriList.map((s) => s.id)));
    }
  };

  const toggleSantri = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!isOpen) return null;

  const targetSantriList = santriList.filter((s) => selectedIds.has(s.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shadow-sm">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Cetak Lembar LJK Standar OMR
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {judul} — {currentTahapCfg.label} ({currentTahapCfg.rentangLabel})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content & Santri Selection */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4">
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-3 sm:p-4 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-3">
            <Info className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">Panduan Penggunaan Lembar LJK OMR Standar:</p>
              <ul className="list-disc list-inside space-y-1 opacity-90">
                <li>Lembar LJK dilengkapi <strong>QR Code Santri</strong> dan <strong>4 Titik Sudut Hitam (Fiducial Markers)</strong> untuk deteksi otomatis via kamera browser.</li>
                <li>Penguji <strong>tidak perlu menghitung nilai</strong>. Cukup arsir <strong>Total Kesalahan (35%)</strong> dan <strong>Halaman Kosong (65%)</strong>.</li>
                <li>Format cetak dioptimalkan untuk kertas <strong>A4</strong> (1 lembar memuat 2 santri berdampingan/berurutan).</li>
              </ul>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                {selectedIds.size === santriList.length ? (
                  <>
                    <CheckSquare className="w-4 h-4" /> Batal Pilih Semua
                  </>
                ) : (
                  <>
                    <Square className="w-4 h-4" /> Pilih Semua ({santriList.length})
                  </>
                )}
              </button>
              <span className="text-xs text-slate-500">
                • {selectedIds.size} santri terpilih
              </span>
            </div>
            {generatingQr && (
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Menyiapkan QR Code...
              </span>
            )}
          </div>

          {/* List Santri Checkbox */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
            {santriList.map((s) => {
              const isChecked = selectedIds.has(s.id);
              return (
                <label
                  key={s.id}
                  onClick={() => toggleSantri(s.id)}
                  className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer select-none transition text-xs ${
                    isChecked
                      ? "border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-medium"
                      : "border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="truncate">
                    <p className="truncate font-semibold">{s.nama_lengkap}</p>
                    <p className="text-[10px] text-slate-500 truncate">
                      {s.kode || "No Kode"} • Halaqoh {s.halaqoh}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3 bg-slate-50 dark:bg-slate-800/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
          >
            Tutup
          </button>
          <button
            type="button"
            disabled={selectedIds.size === 0 || generatingQr}
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 disabled:opacity-50 transition cursor-pointer"
          >
            {generatingQr ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Menyiapkan Lembar...
              </>
            ) : (
              <>
                <Printer className="w-4 h-4" /> Cetak ({selectedIds.size}) Lembar LJK
              </>
            )}
          </button>
        </div>
      </div>

      {/* AREA CETAK TERSEMBUNYI (DIKONSUMSI OLEH REACT-TO-PRINT) */}
      <div className="hidden">
        <div ref={printRef} className="print-ljk-container text-black bg-white font-sans">
          {targetSantriList.map((santri, idx) => {
            const qrUrl = qrMap[santri.id];
            return (
              <div
                key={santri.id}
                className="ljk-single-page p-6 border-b-2 border-dashed border-gray-400 mb-8 page-break-after"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  pageBreakInside: "avoid",
                  pageBreakAfter: (idx + 1) % 2 === 0 ? "always" : "auto",
                }}
              >
                {/* Header Lembar Penilaian */}
                <div className="flex items-start justify-between border-b-2 border-black pb-2 mb-3">
                  <div className="flex-1 pr-4">
                    <h1 className="text-base font-extrabold uppercase tracking-tight text-black leading-tight">
                      LPTQ PESANTREN DARUSSALAM BLOKAGUNG
                    </h1>
                    <h2 className="text-sm font-bold text-black uppercase tracking-wide">
                      LEMBAR PENILAIAN TAHFIDZ KHOTMIL — {currentTahapCfg.label.toUpperCase()}
                    </h2>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-2 text-xs text-black font-medium">
                      <div>
                        <span className="font-bold">NAMA : </span>
                        <span>{santri.nama_lengkap}</span>
                      </div>
                      <div>
                        <span className="font-bold">NO. TES/KODE : </span>
                        <span>{santri.kode || "-"}</span>
                      </div>
                      <div>
                        <span className="font-bold">JUZ DIUJI : </span>
                        <span>{currentTahapCfg.rentangLabel}</span>
                      </div>
                      <div>
                        <span className="font-bold">MUSTAMI&apos; : </span>
                        <span className="inline-block border-b border-black w-28"></span>
                      </div>
                    </div>
                  </div>

                  {/* QR Code Khusus Scanner Kamera */}
                  <div className="flex flex-col items-center shrink-0 text-center">
                    {qrUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={qrUrl}
                        alt="QR Code LJK"
                        className="w-20 h-20 border border-black p-0.5 bg-white"
                      />
                    ) : (
                      <div className="w-20 h-20 border border-black flex items-center justify-center text-[9px]">
                        QR CODE
                      </div>
                    )}
                    <span className="text-[8px] font-mono tracking-tighter mt-0.5">
                      {santri.kode || santri.id.slice(0, 8)}
                    </span>
                  </div>
                </div>

                {/* KOTAK TABEL OMR DENGAN 4 TITIK JANGKAR SUDUT (FIDUCIAL MARKERS) */}
                <div className="relative border-2 border-black p-3 bg-white">
                  {/* 4 Corner Anchors (Bujur sangkar hitam solid 18x18px) */}
                  <div
                    className="absolute top-1 left-1 w-4 h-4 bg-black"
                    title="Corner Top-Left"
                  />
                  <div
                    className="absolute top-1 right-1 w-4 h-4 bg-black"
                    title="Corner Top-Right"
                  />
                  <div
                    className="absolute bottom-1 left-1 w-4 h-4 bg-black"
                    title="Corner Bottom-Left"
                  />
                  <div
                    className="absolute bottom-1 right-1 w-4 h-4 bg-black"
                    title="Corner Bottom-Right"
                  />

                  {/* Tabel Grid Penilaian */}
                  <table className="w-full text-center border-collapse border border-black text-xs my-3">
                    <thead>
                      <tr className="bg-gray-100 border-b border-black text-black">
                        <th className="border border-black py-1.5 px-1 w-8 font-bold">NO</th>
                        <th className="border border-black py-1.5 px-1 w-12 font-bold">JUZ</th>
                        <th className="border border-black py-1.5 px-2 w-32 font-bold text-left">
                          AREA CATATAN TURUS (PENSIL)
                        </th>
                        <th className="border border-black py-1.5 px-2 font-bold">
                          ARSIR TOTAL KESALAHAN (BOBOT 35%)
                          <div className="text-[9px] font-normal text-gray-700">
                            Puluhan (0-3) &bull; Satuan (0-9)
                          </div>
                        </th>
                        <th className="border border-black py-1.5 px-2 font-bold">
                          ARSIR HALAMAN KOSONG (BOBOT 65%)
                          <div className="text-[9px] font-normal text-gray-700">
                            Puluhan (0-2) &bull; Satuan (0-9)
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentTahapCfg.juzList.map((juzNum, rowIdx) => (
                        <tr key={juzNum} className="border-b border-black">
                          <td className="border border-black py-2 font-bold text-sm">
                            {rowIdx + 1}
                          </td>
                          <td className="border border-black py-2 font-extrabold text-sm">
                            {juzNum}
                          </td>
                          {/* Ruang Bebas Coretan Turus Penguji */}
                          <td className="border border-black py-2 px-2 text-left bg-gray-50/40 relative">
                            <span className="text-[9px] text-gray-400 select-none">
                              Coret turus lidi IIII di sini...
                            </span>
                          </td>
                          {/* Kolom OMR Total Kesalahan: Puluhan (0..3) & Satuan (0..9) */}
                          <td className="border border-black py-2 px-1 align-middle">
                            <div className="flex flex-col items-center justify-center gap-1">
                              {/* Puluhan Kesalahan */}
                              <div className="flex items-center gap-1">
                                <span className="text-[9px] font-bold text-gray-600 w-7 text-right">
                                  P:
                                </span>
                                {[0, 1, 2, 3].map((d) => (
                                  <span
                                    key={d}
                                    className="w-4 h-4 rounded-full border border-black flex items-center justify-center text-[9px] font-bold"
                                  >
                                    {d}
                                  </span>
                                ))}
                              </div>
                              {/* Satuan Kesalahan */}
                              <div className="flex items-center gap-1">
                                <span className="text-[9px] font-bold text-gray-600 w-7 text-right">
                                  S:
                                </span>
                                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
                                  <span
                                    key={d}
                                    className="w-4 h-4 rounded-full border border-black flex items-center justify-center text-[9px] font-bold"
                                  >
                                    {d}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </td>
                          {/* Kolom OMR Halaman Kosong: Puluhan (0..2) & Satuan (0..9) */}
                          <td className="border border-black py-2 px-1 align-middle">
                            <div className="flex flex-col items-center justify-center gap-1">
                              {/* Puluhan Halaman Kosong */}
                              <div className="flex items-center gap-1">
                                <span className="text-[9px] font-bold text-gray-600 w-7 text-right">
                                  P:
                                </span>
                                {[0, 1, 2].map((d) => (
                                  <span
                                    key={d}
                                    className="w-4 h-4 rounded-full border border-black flex items-center justify-center text-[9px] font-bold"
                                  >
                                    {d}
                                  </span>
                                ))}
                              </div>
                              {/* Satuan Halaman Kosong */}
                              <div className="flex items-center gap-1">
                                <span className="text-[9px] font-bold text-gray-600 w-7 text-right">
                                  S:
                                </span>
                                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
                                  <span
                                    key={d}
                                    className="w-4 h-4 rounded-full border border-black flex items-center justify-center text-[9px] font-bold"
                                  >
                                    {d}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Keterangan & Catatan Operasional */}
                  <div className="mt-1 flex items-start justify-between text-[10px] text-gray-800">
                    <div className="space-y-0.5">
                      <p className="font-bold">PETUNJUK PENILAIAN LJK:</p>
                      <p>1. Coret turus bebas di Area Turus saat santri melantunkan ayat.</p>
                      <p>2. Setelah selesai juz, arsir bulatan Total Kesalahan & Halaman Kosong (Cukup 4 bulatan per juz).</p>
                      <p>3. Contoh: Salah 9, Hal Kosong 0 &rarr; Arsir P:[0] S:[9] pada Kesalahan, dan P:[0] S:[0] pada Halaman.</p>
                      <p>4. NILAI DIHITUNG OTOMATIS OLEH SISTEM (35% Kesalahan + 65% Keterbacaan Halaman).</p>
                    </div>
                    <div className="text-center pr-6 pt-1">
                      <p className="mb-8">Tanda Tangan Penguji,</p>
                      <p className="font-bold underline">( _______________________ )</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
