"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { FileSpreadsheet } from "lucide-react";
import {
  fetchAllSantriFiltered,
  fetchAbsensiBulan,
  upsertAbsensiCell,
} from "@/lib/services/tahfidz-service";
import {
  HALAQOH_BAGIAN_LIST,
  HALAQOH_KELAS_LIST,
  type Santri,
  type SesiAbsen,
  type StatusAbsen,
} from "@/types/database";
import { HalaqohBadge } from "@/components/ui/Badges";
import { PrintButton } from "@/components/ui/PrintButton";
import { exportJsonToExcel } from "@/lib/utils/excel";
import { useToast } from "@/components/ui/Toast";

const BULAN_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

// Mengecek apakah tanggal tertentu adalah hari Jumat (getDay() === 5)
function isFridayDate(year: number, month1Based: number, day: number): boolean {
  const d = new Date(year, month1Based - 1, day);
  return d.getDay() === 5;
}

export default function KegiatanAbsensiPage() {
  const { showToast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  const now = new Date();
  const [tahun, setTahun] = useState(now.getFullYear());
  const [bulan, setBulan] = useState(now.getMonth() + 1);
  const [sesi, setSesi] = useState<SesiAbsen>("pagi");

  const [asramaFilter, setAsramaFilter] = useState("");
  const [kelasFilter, setKelasFilter] = useState<number | "">("");
  const [bagianFilter, setBagianFilter] = useState("");

  const [santriList, setSantriList] = useState<Santri[]>([]);
  const [absenMap, setAbsenMap] = useState<Record<string, StatusAbsen>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const daysInMonth = new Date(tahun, bulan, 0).getDate();
  const dayNumbers = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const loadGrid = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [santriData, absenData] = await Promise.all([
        fetchAllSantriFiltered({
          asrama: asramaFilter,
          halaqoh_kelas: kelasFilter,
          halaqoh_bagian: bagianFilter,
        }),
        fetchAbsensiBulan(tahun, bulan, sesi),
      ]);

      const mapping: Record<string, StatusAbsen> = {};
      absenData.forEach((item) => {
        const dayNum = Number(item.tanggal.split("-")[2]);
        mapping[`${item.santri_id}_${dayNum}`] = item.status;
      });

      setSantriList(santriData);
      setAbsenMap(mapping);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat grid absensi.");
    } finally {
      setLoading(false);
    }
  }, [tahun, bulan, sesi, asramaFilter, kelasFilter, bagianFilter]);

  useEffect(() => {
    loadGrid();
  }, [loadGrid]);

  const handleCellChange = async (santriId: string, day: number, nextStatus: StatusAbsen | "") => {
    const tanggalStr = `${tahun}-${String(bulan).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const key = `${santriId}_${day}`;
    const prevStatus = absenMap[key];

    setAbsenMap((prev) => {
      const copy = { ...prev };
      if (nextStatus === "") {
        delete copy[key];
      } else {
        copy[key] = nextStatus;
      }
      return copy;
    });

    try {
      await upsertAbsensiCell({
        santri_id: santriId,
        tanggal: tanggalStr,
        sesi,
        status: nextStatus,
      });
      showToast("success", `Absensi tanggal ${day} (${sesi}) tersimpan.`);
    } catch (err) {
      setAbsenMap((prev) => {
        const copy = { ...prev };
        if (prevStatus) copy[key] = prevStatus;
        else delete copy[key];
        return copy;
      });
      showToast("error", err instanceof Error ? err.message : "Gagal menyimpan absensi.");
    }
  };

  const countStatus = (santriId: string, target: StatusAbsen) => {
    let total = 0;
    for (const d of dayNumbers) {
      if (absenMap[`${santriId}_${d}`] === target) total += 1;
    }
    return total;
  };

  const handleExportExcel = () => {
    const rows = santriList.map((s, idx) => {
      const rowObj: Record<string, string | number> = {
        No: idx + 1,
        Kode: s.kode,
        "Nama Lengkap": s.nama_lengkap,
        Asrama: s.asrama,
        Kamar: s.kamar,
        Halaqoh: s.halaqoh,
        Sesi: sesi.toUpperCase(),
      };
      for (const d of dayNumbers) {
        const fri = isFridayDate(tahun, bulan, d);
        const val = absenMap[`${s.id}_${d}`];
        rowObj[`Tgl_${d}`] = fri ? "JUMAT" : val ? val[0].toUpperCase() : "-";
      }
      rowObj["Total Hadir"] = countStatus(s.id, "hadir");
      rowObj["Total Alfa"] = countStatus(s.id, "alfa");
      rowObj["Total Izin"] = countStatus(s.id, "izin");
      rowObj["Total Sakit"] = countStatus(s.id, "sakit");
      return rowObj;
    });

    exportJsonToExcel(
      rows,
      `Absensi_${BULAN_NAMES[bulan - 1]}_${tahun}_Sesi_${sesi}`,
      "RekapAbsensi"
    );
    showToast("success", "Rekap absensi bulanan berhasil diekspor ke Excel.");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Kegiatan Tahfidz Umum (Absensi Harian Pagi & Malam)
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Pilih status di dalam sel tanggal (H: Hadir, A: Alfa, I: Izin, S: Sakit). Kolom hari
            Jumat otomatis diarsir dan dinonaktifkan.
          </p>
        </div>

        <div className="no-print flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Ekspor Excel</span>
          </button>

          <PrintButton
            contentRef={printRef}
            documentTitle={`Absensi_${BULAN_NAMES[bulan - 1]}_${tahun}_${sesi}`}
          />
        </div>
      </div>

      {/* Filter Bulan, Tahun, Sesi, Asrama, Kelas, Bagian */}
      <div className="no-print grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 rounded-md border border-slate-300 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900">
        <select
          value={bulan}
          onChange={(e) => setBulan(Number(e.target.value))}
          aria-label="Pilih Bulan"
          className="min-h-[44px] rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
        >
          {BULAN_NAMES.map((name, idx) => (
            <option key={name} value={idx + 1}>
              {name}
            </option>
          ))}
        </select>

        <input
          type="number"
          value={tahun}
          onChange={(e) => setTahun(Number(e.target.value) || now.getFullYear())}
          aria-label="Pilih Tahun"
          className="min-h-[44px] rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-mono dark:border-slate-700 dark:bg-slate-800"
        />

        <div className="flex rounded-md border border-slate-300 overflow-hidden dark:border-slate-700">
          <button
            type="button"
            onClick={() => setSesi("pagi")}
            className={`flex-1 min-h-[44px] text-xs font-bold uppercase ${
              sesi === "pagi"
                ? "bg-emerald-800 text-white"
                : "bg-white text-slate-800 dark:bg-slate-800 dark:text-slate-200"
            }`}
          >
            Sesi Pagi
          </button>
          <button
            type="button"
            onClick={() => setSesi("malam")}
            className={`flex-1 min-h-[44px] text-xs font-bold uppercase ${
              sesi === "malam"
                ? "bg-emerald-800 text-white"
                : "bg-white text-slate-800 dark:bg-slate-800 dark:text-slate-200"
            }`}
          >
            Sesi Malam
          </button>
        </div>

        <input
          type="text"
          value={asramaFilter}
          onChange={(e) => setAsramaFilter(e.target.value)}
          placeholder="Filter Asrama..."
          aria-label="Filter Asrama"
          className="min-h-[44px] rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
        />

        <select
          value={kelasFilter}
          onChange={(e) => setKelasFilter(e.target.value ? Number(e.target.value) : "")}
          aria-label="Filter Halaqoh Kelas"
          className="min-h-[44px] rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="">Semua Kelas</option>
          {HALAQOH_KELAS_LIST.map((k) => (
            <option key={k} value={k}>
              Kelas {k}
            </option>
          ))}
        </select>

        <select
          value={bagianFilter}
          onChange={(e) => setBagianFilter(e.target.value)}
          aria-label="Filter Halaqoh Bagian"
          className="min-h-[44px] rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="">Semua Bagian</option>
          {HALAQOH_BAGIAN_LIST.map((b) => (
            <option key={b} value={b}>
              Bagian {b}
            </option>
          ))}
        </select>
      </div>

      {/* Grid Bulanan 1-31 */}
      <div
        ref={printRef}
        className="overflow-x-auto rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300">
            Bulan: {BULAN_NAMES[bulan - 1]} {tahun} | Sesi: {sesi.toUpperCase()}
          </span>
          <span className="text-xs text-slate-600 dark:text-slate-400">
            Keterangan: H = Hadir, A = Alfa, I = Izin, S = Sakit, JUM = Hari Jumat (Libur)
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm">Memuat tabel absensi bulanan...</div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-red-800 dark:text-red-300">{error}</div>
        ) : santriList.length === 0 ? (
          <div className="p-8 text-center text-sm">
            Tidak ada santri yang sesuai dengan filter. Tambahkan santri terlebih dahulu di menu Data
            Santri.
          </div>
        ) : (
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200">
                <th className="px-2 py-2.5 text-left">No</th>
                <th className="sticky left-0 z-10 bg-slate-100 dark:bg-slate-800 px-3 py-2.5 text-left min-w-[180px]">
                  Nama Santri
                </th>
                <th className="px-2 py-2.5 text-left">Halaqoh</th>
                {dayNumbers.map((d) => {
                  const fri = isFridayDate(tahun, bulan, d);
                  return (
                    <th
                      key={d}
                      className={`px-1.5 py-2 text-center font-mono ${
                        fri
                          ? "bg-slate-300 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                          : ""
                      }`}
                    >
                      <div>{d}</div>
                      {fri && <div className="text-[9px] font-bold">JUM</div>}
                    </th>
                  );
                })}
                <th className="px-2 py-2.5 text-center bg-emerald-100 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-200">
                  H
                </th>
                <th className="px-2 py-2.5 text-center bg-red-100 text-red-950 dark:bg-red-950 dark:text-red-200">
                  A
                </th>
                <th className="px-2 py-2.5 text-center bg-amber-100 text-amber-950 dark:bg-amber-950 dark:text-amber-200">
                  I
                </th>
                <th className="px-2 py-2.5 text-center bg-sky-100 text-sky-950 dark:bg-sky-950 dark:text-sky-200">
                  S
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {santriList.map((s, idx) => (
                <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-2 py-2 font-mono">{idx + 1}</td>
                  <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 px-3 py-2 font-medium whitespace-nowrap border-r border-slate-200 dark:border-slate-800">
                    {s.nama_lengkap}
                  </td>
                  <td className="px-2 py-2">
                    <HalaqohBadge kelas={s.halaqoh_kelas} bagian={s.halaqoh_bagian} />
                  </td>
                  {dayNumbers.map((d) => {
                    const fri = isFridayDate(tahun, bulan, d);
                    const currentVal = absenMap[`${s.id}_${d}`] ?? "";

                    if (fri) {
                      return (
                        <td
                          key={d}
                          title="Hari Jumat - Tidak ada absensi"
                          className="bg-slate-200/80 dark:bg-slate-800/90 text-center text-[10px] font-mono text-slate-600 dark:text-slate-400 select-none"
                        >
                          -
                        </td>
                      );
                    }

                    return (
                      <td key={d} className="p-0.5 text-center">
                        <select
                          aria-label={`Absensi ${s.nama_lengkap} tanggal ${d}`}
                          value={currentVal}
                          onChange={(e) =>
                            handleCellChange(s.id, d, e.target.value as StatusAbsen | "")
                          }
                          className={`min-h-[36px] min-w-[42px] rounded border text-center font-mono text-xs font-bold ${
                            currentVal === "hadir"
                              ? "border-emerald-700 bg-emerald-100 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-200"
                              : currentVal === "alfa"
                              ? "border-red-700 bg-red-100 text-red-950 dark:bg-red-950 dark:text-red-200"
                              : currentVal === "izin"
                              ? "border-amber-700 bg-amber-100 text-amber-950 dark:bg-amber-950 dark:text-amber-200"
                              : currentVal === "sakit"
                              ? "border-sky-700 bg-sky-100 text-sky-950 dark:bg-sky-950 dark:text-sky-200"
                              : "border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          <option value="">-</option>
                          <option value="hadir">H</option>
                          <option value="alfa">A</option>
                          <option value="izin">I</option>
                          <option value="sakit">S</option>
                        </select>
                      </td>
                    );
                  })}
                  <td className="px-2 py-2 text-center font-mono font-bold text-emerald-900 dark:text-emerald-300">
                    {countStatus(s.id, "hadir")}
                  </td>
                  <td className="px-2 py-2 text-center font-mono font-bold text-red-900 dark:text-red-300">
                    {countStatus(s.id, "alfa")}
                  </td>
                  <td className="px-2 py-2 text-center font-mono font-bold text-amber-900 dark:text-amber-300">
                    {countStatus(s.id, "izin")}
                  </td>
                  <td className="px-2 py-2 text-center font-mono font-bold text-sky-900 dark:text-sky-300">
                    {countStatus(s.id, "sakit")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
