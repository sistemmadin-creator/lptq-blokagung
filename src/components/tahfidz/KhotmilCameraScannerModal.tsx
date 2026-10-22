"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  Camera,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Save,
  Pencil,
  Upload,
  RefreshCw,
  Award,
} from "lucide-react";
import { JenisKhotmil, TahapConfig } from "@/types/database";
import {
  processVideoFrame,
  sampleBubbleDarkness,
} from "@/lib/omr/khotmil-omr-engine";
import {
  ScannedSheetResult,
  calculateKhotmilScore,
  ScannedJuzRow,
} from "@/lib/omr/khotmil-omr-types";
import { upsertKhotmilNilaiBatch } from "@/lib/services/tahfidz-service";
import { useToast } from "@/components/ui/Toast";

interface KhotmilCameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  jenis: JenisKhotmil;
  judul: string;
  currentTahapCfg: TahapConfig;
  onSuccessSave: () => void;
}

export function KhotmilCameraScannerModal({
  isOpen,
  onClose,
  jenis,
  judul,
  currentTahapCfg,
  onSuccessSave,
}: KhotmilCameraScannerModalProps) {
  const { showToast } = useToast();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(true);
  const [scanStatus, setScanStatus] = useState<
    "searching" | "detected" | "verified"
  >("searching");

  // Hasil scan yang sedang diverifikasi penguji
  const [verifiedResult, setVerifiedResult] =
    useState<ScannedSheetResult | null>(null);
  const [saving, setSaving] = useState(false);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  // Start camera stream
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);
    setVerifiedResult(null);
    setScanning(true);
    setScanStatus("searching");

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Peramban Anda tidak mendukung akses kamera langsung.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err: any) {
      console.error("Gagal memulai kamera:", err);
      setCameraError(
        err.name === "NotAllowedError"
          ? "Akses kamera ditolak. Berikan izin kamera di pengaturan browser Anda."
          : err.message || "Gagal mengakses kamera perangkat."
      );
    }
  }, [stopCamera]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  // Frame processing loop
  useEffect(() => {
    if (!isOpen || !cameraActive || !scanning || verifiedResult) return;

    let isSubscribed = true;
    let animId: number;

    const scanFrame = () => {
      if (!isSubscribed) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (
        video &&
        canvas &&
        video.readyState === video.HAVE_ENOUGH_DATA &&
        video.videoWidth > 0
      ) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });

        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          // Area viewfinder acuan
          const guideW = canvas.width * 0.85;
          const guideH = canvas.height * 0.70;
          const guideX = (canvas.width - guideW) / 2;
          const guideY = (canvas.height - guideH) / 2;

          const res = processVideoFrame(canvas, {
            x: guideX,
            y: guideY,
            width: guideW,
            height: guideH,
          });

          if (res.status === "success" && res.sheetResult) {
            // Suara getar halus / notifikasi jika didukung
            if (typeof navigator !== "undefined" && navigator.vibrate) {
              try {
                navigator.vibrate(80);
              } catch (_) {}
            }

            setScanStatus("detected");
            setScanning(false);
            setVerifiedResult(res.sheetResult);
            return;
          }
        }
      }

      // Jadwalkan scan frame berikutnya (setiap ~180ms)
      setTimeout(() => {
        if (isSubscribed && scanning) {
          animId = requestAnimationFrame(scanFrame);
        }
      }, 180);
    };

    animId = requestAnimationFrame(scanFrame);

    return () => {
      isSubscribed = false;
      cancelAnimationFrame(animId);
    };
  }, [isOpen, cameraActive, scanning, verifiedResult]);

  // Mengubah angka manual pada pop-up konfirmasi
  const handleScoreRowChange = (
    rowIndex: number,
    field: "kesalahan" | "halKosong",
    valueStr: string
  ) => {
    if (!verifiedResult) return;

    const val = parseInt(valueStr, 10);
    const safeVal = Number.isNaN(val) ? 0 : Math.max(0, val);

    const updatedRows = [...verifiedResult.rows];
    const currentRow = { ...updatedRows[rowIndex] };

    if (field === "kesalahan") {
      currentRow.kesalahan = safeVal;
    } else {
      currentRow.halKosong = Math.min(20, safeVal);
    }

    const recalculated = calculateKhotmilScore(
      currentRow.kesalahan,
      currentRow.halKosong
    );

    currentRow.nilai = recalculated.nilai;
    currentRow.skorHalaman = recalculated.skorHalaman;
    currentRow.skorKesalahan = recalculated.skorKesalahan;
    currentRow.lulusKkm = recalculated.lulusKkm;
    currentRow.manualEdited = true;

    updatedRows[rowIndex] = currentRow;

    const totalNilai = updatedRows.reduce((acc, r) => acc + r.nilai, 0);
    const rataRata = Number((totalNilai / updatedRows.length).toFixed(2));

    setVerifiedResult({
      ...verifiedResult,
      rows: updatedRows,
      rataRata,
      lulusSemua: rataRata >= 85,
    });
  };

  // Simpan nilai terverifikasi ke Supabase
  const handleConfirmSave = async () => {
    if (!verifiedResult) return;

    setSaving(true);
    try {
      const payload = verifiedResult.rows.map((r) => ({
        juz: r.juz,
        nilai: r.nilai,
      }));

      await upsertKhotmilNilaiBatch(
        verifiedResult.santriId,
        verifiedResult.jenis,
        verifiedResult.tahap,
        payload
      );

      showToast(
        "success",
        `Alhamdulillah! Nilai LJK ${verifiedResult.santriNama || "Santri"} berhasil disimpan.`
      );

      onSuccessSave();
      // Siapkan scan berikutnya tanpa harus menutup modal
      setVerifiedResult(null);
      setScanning(true);
      setScanStatus("searching");
    } catch (err: any) {
      showToast("error", "Gagal menyimpan nilai LJK: " + (err.message || "Kesalahan"));
    } finally {
      setSaving(false);
    }
  };

  // Upload file gambar alternatif jika kamera bermasalah
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current || document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const res = processVideoFrame(canvas);
          if (res.status === "success" && res.sheetResult) {
            setScanStatus("detected");
            setScanning(false);
            setVerifiedResult(res.sheetResult);
            showToast("success", "Gambar LJK berhasil dibaca!");
          } else {
            showToast(
              "error",
              res.errorMessage || "Tidak dapat mendeteksi QR Code atau LJK pada gambar ini."
            );
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden text-white">
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-inner">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Scanner LJK Kamera
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                  Client-Side OMR
                </span>
              </h2>
              <p className="text-xs text-slate-400 truncate">
                {judul} — {currentTahapCfg.label}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Area Scanner / Verifikasi */}
        <div className="relative flex-1 bg-black flex flex-col items-center justify-center overflow-hidden min-h-[360px]">
          {/* Canvas tersembunyi untuk analisis citra */}
          <canvas ref={canvasRef} className="hidden" />

          {/* MODE 1: Kamera Sedang Aktif Memindai */}
          {!verifiedResult && (
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover max-h-[58vh]"
              />

              {/* Viewfinder Bounding Box Overlay */}
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                <div className="relative w-[88%] max-w-md aspect-[4/3] border-2 border-emerald-400/70 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.3)] flex flex-col justify-between p-3">
                  {/* Corner Target Markers */}
                  <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                  <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                  <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

                  {/* Top Guide Text */}
                  <div className="self-center bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-medium text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 animate-pulse">
                    <Sparkles className="w-3.5 h-3.5" /> Arahkan ke QR Code & Tabel LJK
                  </div>

                  {/* Scanning Laser Line */}
                  <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#34d399] animate-bounce" />

                  {/* Bottom Guide Text */}
                  <div className="self-center bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[10px] text-slate-300 border border-slate-700">
                    Pastikan cahaya terang dan kertas tidak terlipat
                  </div>
                </div>
              </div>

              {/* Fallback Jika Kamera Error */}
              {cameraError && (
                <div className="absolute inset-0 z-20 bg-slate-900/95 flex flex-col items-center justify-center p-6 text-center">
                  <AlertCircle className="w-12 h-12 text-rose-400 mb-3" />
                  <p className="text-sm font-semibold text-white mb-1">
                    Kamera Tidak Dapat Diakses
                  </p>
                  <p className="text-xs text-slate-400 mb-5 max-w-xs">{cameraError}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={startCamera}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white transition flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Coba Lagi
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" /> Unggah Foto LJK
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MODE 2: Pop-up Verifikasi Nilai yang Terdeteksi */}
          {verifiedResult && (
            <div className="w-full h-full p-4 sm:p-5 overflow-y-auto space-y-4 bg-slate-900">
              {/* Header Kartu Santri Terdeteksi */}
              <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-400">
                    LJK Berhasil Terdeteksi
                  </span>
                  <h3 className="text-base font-bold text-white">
                    {verifiedResult.santriNama || "Nama Santri"}
                  </h3>
                  <p className="text-xs text-slate-400">
                    NIS: {verifiedResult.santriKode || "-"} &bull; {currentTahapCfg.label}
                  </p>
                </div>
                <div className="text-right">
                  <div
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${
                      verifiedResult.lulusSemua
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                        : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                    }`}
                  >
                    <Award className="w-3.5 h-3.5" />
                    {verifiedResult.lulusSemua ? "TUNTAS (KKM 85)" : "BELUM TUNTAS"}
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    Rata-rata: <span className="font-bold text-sm text-white">{verifiedResult.rataRata}</span>
                  </p>
                </div>
              </div>

              {/* Tabel Rincian Nilai per Juz */}
              <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/60">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/60 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3 text-center w-14">Juz</th>
                      <th className="py-2.5 px-2">Salah (Turus)</th>
                      <th className="py-2.5 px-2">Hal. Kosong</th>
                      <th className="py-2.5 px-2 text-right">Nilai Akhir</th>
                      <th className="py-2.5 px-2 text-center w-16">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {verifiedResult.rows.map((row, idx) => (
                      <tr
                        key={row.juz}
                        className="hover:bg-slate-800/30 transition text-slate-200"
                      >
                        <td className="py-2.5 px-3 text-center font-extrabold text-sm text-white">
                          Juz {row.juz}
                        </td>
                        {/* Input Jumlah Kesalahan */}
                        <td className="py-2 px-2">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min={0}
                              max={39}
                              value={row.kesalahan}
                              onChange={(e) =>
                                handleScoreRowChange(idx, "kesalahan", e.target.value)
                              }
                              className="w-14 px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-center font-bold text-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                            />
                            <span className="text-[10px] text-slate-400">
                              (-{row.kesalahan} pt)
                            </span>
                          </div>
                        </td>
                        {/* Input Halaman Kosong */}
                        <td className="py-2 px-2">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min={0}
                              max={20}
                              value={row.halKosong}
                              onChange={(e) =>
                                handleScoreRowChange(idx, "halKosong", e.target.value)
                              }
                              className="w-14 px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-center font-bold text-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                            />
                            <span className="text-[10px] text-slate-400">
                              ({row.skorHalaman} pt)
                            </span>
                          </div>
                        </td>
                        {/* Nilai Akhir Otomatis */}
                        <td className="py-2 px-2 text-right">
                          <span
                            className={`font-black text-base ${
                              row.lulusKkm ? "text-emerald-400" : "text-amber-400"
                            }`}
                          >
                            {row.nilai}
                          </span>
                        </td>
                        {/* Status Lulus */}
                        <td className="py-2 px-2 text-center">
                          {row.lulusKkm ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold">
                              Lulus
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-semibold">
                              Remidi
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <Pencil className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                Anda dapat mengoreksi angka Kesalahan & Halaman Kosong secara langsung di tabel jika diperlukan.
              </p>
            </div>
          )}
        </div>

        {/* Input File Tersembunyi untuk Upload Foto Alternatif */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleImageUpload}
          className="hidden"
        />

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-800 flex items-center justify-between bg-slate-900/90">
          {!verifiedResult ? (
            <div className="flex items-center justify-between w-full">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition"
              >
                <Upload className="w-4 h-4" /> Unggah Foto Alternatif
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
              >
                Tutup
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full">
              <button
                type="button"
                onClick={() => {
                  setVerifiedResult(null);
                  setScanning(true);
                  setScanStatus("searching");
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
              >
                <RotateCcw className="w-4 h-4" /> Pindai Ulang
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleConfirmSave}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 disabled:opacity-50 transition cursor-pointer"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Menyimpan Nilai...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Simpan Nilai ke Sistem
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
