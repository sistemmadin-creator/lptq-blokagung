"use client";

import React, { useState, useMemo } from "react";
import { TrendingUp, Users, Calendar, Award, BookOpen, Layers } from "lucide-react";

export interface EvaluasiDayData {
  tanggal: string; // ISO date YYYY-MM-DD
  label: string; // e.g. "15 Okt"
  fullDateLabel: string; // e.g. "Rabu, 15 Okt 2026"
  santriCount: number; // Jumlah santri yang setor pada tanggal ini (Sumbu Y)
  totalJuz: number; // Total juz tambahan
  santriNames: string[]; // Daftar nama santri
}

interface EvaluasiLineChartProps {
  data: EvaluasiDayData[];
  timeframe: "7d" | "14d" | "30d" | "month";
  onTimeframeChange: (tf: "7d" | "14d" | "30d" | "month") => void;
  filterType: "evaluasi" | "juz_baru" | "all";
  onFilterTypeChange: (t: "evaluasi" | "juz_baru" | "all") => void;
  loading?: boolean;
}

export function EvaluasiLineChart({
  data,
  timeframe,
  onTimeframeChange,
  filterType,
  onFilterTypeChange,
  loading = false,
}: EvaluasiLineChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Perhitungan statistik ringkas
  const stats = useMemo(() => {
    let peakCount = 0;
    let peakDate = "-";
    let totalSantriSetor = 0;
    let totalJuzDisetor = 0;
    let activeDays = 0;

    data.forEach((d) => {
      totalSantriSetor += d.santriCount;
      totalJuzDisetor += d.totalJuz;
      if (d.santriCount > 0) activeDays += 1;
      if (d.santriCount > peakCount) {
        peakCount = d.santriCount;
        peakDate = d.label;
      }
    });

    const avgDaily = activeDays > 0 ? (totalSantriSetor / activeDays).toFixed(1) : "0";

    return {
      peakCount,
      peakDate,
      totalSantriSetor,
      totalJuzDisetor: totalJuzDisetor.toFixed(1),
      avgDaily,
      activeDays,
    };
  }, [data]);

  // Dimensi SVG
  const svgWidth = 800;
  const svgHeight = 260;
  const paddingLeft = 45;
  const paddingRight = 25;
  const paddingTop = 25;
  const paddingBottom = 45;

  const chartW = svgWidth - paddingLeft - paddingRight;
  const chartH = svgHeight - paddingTop - paddingBottom;

  // Skala Y maksimum
  const maxY = useMemo(() => {
    const highest = Math.max(...data.map((d) => d.santriCount), 0);
    if (highest <= 3) return 5;
    if (highest <= 7) return 10;
    if (highest <= 15) return 20;
    return Math.ceil((highest * 1.2) / 5) * 5;
  }, [data]);

  // Tick marks sumbu Y (4 garis horizontal)
  const yTicks = useMemo(() => {
    const steps = 4;
    const ticks = [];
    for (let i = 0; i <= steps; i++) {
      const val = Math.round((maxY / steps) * i);
      const yPos = paddingTop + chartH - (val / maxY) * chartH;
      ticks.push({ val, yPos });
    }
    return ticks;
  }, [maxY, paddingTop, chartH]);

  // Hitung koordinat (X, Y) untuk setiap data point
  const points = useMemo(() => {
    if (data.length === 0) return [];
    if (data.length === 1) {
      const y = paddingTop + chartH - (data[0].santriCount / maxY) * chartH;
      return [{ x: paddingLeft + chartW / 2, y, ...data[0] }];
    }

    return data.map((d, i) => {
      const x = paddingLeft + (i / (data.length - 1)) * chartW;
      const y = paddingTop + chartH - (d.santriCount / maxY) * chartH;
      return { x, y, ...d };
    });
  }, [data, paddingLeft, chartW, paddingTop, chartH, maxY]);

  // Generate SVG path untuk garis dan area gradien
  const { linePath, areaPath } = useMemo(() => {
    if (points.length === 0) return { linePath: "", areaPath: "" };
    if (points.length === 1) {
      const p = points[0];
      return {
        linePath: `M ${p.x - 10} ${p.y} L ${p.x + 10} ${p.y}`,
        areaPath: `M ${p.x - 10} ${p.y} L ${p.x + 10} ${p.y} L ${p.x + 10} ${
          paddingTop + chartH
        } L ${p.x - 10} ${paddingTop + chartH} Z`,
      };
    }

    // Bangun path garis
    const pathSegments = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`);
    const line = pathSegments.join(" ");

    // Bangun path area gradien di bawah garis
    const firstX = points[0].x.toFixed(1);
    const lastX = points[points.length - 1].x.toFixed(1);
    const baselineY = (paddingTop + chartH).toFixed(1);
    const area = `${line} L ${lastX} ${baselineY} L ${firstX} ${baselineY} Z`;

    return { linePath: line, areaPath: area };
  }, [points, paddingTop, chartH]);

  const activePoint = hoveredIndex !== null && points[hoveredIndex] ? points[hoveredIndex] : null;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
      {/* Header Grafik */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>Perkembangan Santri Tahfidz (Evaluasi Hafalan)</span>
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Garis horizontal: <strong className="text-slate-700 dark:text-slate-300">Tanggal Setor</strong> • Garis
            vertikal: <strong className="text-slate-700 dark:text-slate-300">Jumlah Santri yang Setor</strong>
          </p>
        </div>

        {/* Filter Controls: Tipe Setoran & Rentang Hari */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Filter Tipe */}
          <div className="inline-flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold">
            <button
              type="button"
              onClick={() => onFilterTypeChange("evaluasi")}
              className={`px-3 py-1.5 rounded-lg transition text-xs ${
                filterType === "evaluasi"
                  ? "bg-brand text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Evaluasi Pusat
            </button>
            <button
              type="button"
              onClick={() => onFilterTypeChange("juz_baru")}
              className={`px-3 py-1.5 rounded-lg transition text-xs ${
                filterType === "juz_baru"
                  ? "bg-brand text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Juz Baru
            </button>
            <button
              type="button"
              onClick={() => onFilterTypeChange("all")}
              className={`px-3 py-1.5 rounded-lg transition text-xs ${
                filterType === "all"
                  ? "bg-brand text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Semua
            </button>
          </div>

          {/* Filter Periode */}
          <div className="inline-flex items-center p-0.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold shadow-sm">
            {(
              [
                { key: "7d", label: "7 Hari" },
                { key: "14d", label: "14 Hari" },
                { key: "30d", label: "30 Hari" },
                { key: "month", label: "Bulan Ini" },
              ] as const
            ).map((tf) => (
              <button
                key={tf.key}
                type="button"
                onClick={() => onTimeframeChange(tf.key)}
                className={`px-2.5 py-1.5 rounded-lg transition text-xs ${
                  timeframe === tf.key
                    ? "bg-slate-900 dark:bg-emerald-800 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Baris Ringkasan Metrik Singkat */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-800/40 p-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Puncak Setoran (Peak)
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
              {stats.peakCount}
            </span>
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Santri ({stats.peakDate})
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-800/40 p-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Rata-rata per Hari Aktif
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-xl font-extrabold font-mono text-slate-900 dark:text-white">
              {stats.avgDaily}
            </span>
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Santri / hari</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-800/40 p-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Total Santri Setor
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-xl font-extrabold font-mono text-slate-900 dark:text-white">
              {stats.totalSantriSetor}
            </span>
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Total Akumulasi</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-800/40 p-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Volume Juz Teruji
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-xl font-extrabold font-mono text-teal-600 dark:text-teal-400">
              {stats.totalJuzDisetor}
            </span>
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Juz</span>
          </div>
        </div>
      </div>

      {/* Area Gambar Line Chart SVG Interaktif */}
      <div className="relative w-full rounded-xl bg-slate-50/50 dark:bg-slate-950/40 p-2 border border-slate-200/60 dark:border-slate-800">
        {/* Floating Tooltip saat Hover Titik */}
        {activePoint && (
          <div
            className="pointer-events-none absolute z-20 transition-all duration-150 transform -translate-x-1/2 -translate-y-full mb-3"
            style={{
              left: `${(activePoint.x / svgWidth) * 100}%`,
              top: `${(activePoint.y / svgHeight) * 100}%`,
            }}
          >
            <div className="rounded-xl bg-slate-950/95 dark:bg-slate-900/95 px-3 py-2 text-white shadow-2xl border border-white/20 backdrop-blur-md whitespace-nowrap">
              <div className="text-[11px] text-emerald-400 font-bold mb-0.5">
                {activePoint.fullDateLabel}
              </div>
              <div className="flex items-center gap-2 text-xs font-black">
                <Users className="w-3.5 h-3.5 text-amber-300" />
                <span>{activePoint.santriCount} Santri Setor</span>
                <span className="text-slate-400">•</span>
                <span className="text-teal-300">+{activePoint.totalJuz} Juz</span>
              </div>
              {activePoint.santriNames.length > 0 && (
                <div className="text-[10px] text-slate-300 mt-1 max-w-[200px] truncate border-t border-slate-800 pt-1">
                  {activePoint.santriNames.slice(0, 3).join(", ")}
                  {activePoint.santriNames.length > 3 && ` +${activePoint.santriNames.length - 3} lainnya`}
                </div>
              )}
            </div>
          </div>
        )}

        {loading ? (
          <div className="h-56 flex items-center justify-center text-xs text-slate-400">
            <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin mr-2" />
            <span>Memuat data tren setoran evaluasi...</span>
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto overflow-visible select-none"
          >
            <defs>
              <linearGradient id="evalAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#059669" stopOpacity="0.32" />
                <stop offset="95%" stopColor="#059669" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Garis Horizontal Sumbu Y Grid */}
            {yTicks.map((t, idx) => (
              <g key={idx}>
                <line
                  x1={paddingLeft}
                  y1={t.yPos}
                  x2={svgWidth - paddingRight}
                  y2={t.yPos}
                  stroke="currentColor"
                  strokeDasharray={t.val === 0 ? "none" : "3 3"}
                  className="text-slate-200 dark:text-slate-800"
                  strokeWidth="1"
                />
                {/* Label Angka Sumbu Vertikal (Jumlah Santri) */}
                <text
                  x={paddingLeft - 8}
                  y={t.yPos + 4}
                  textAnchor="end"
                  className="fill-slate-400 dark:fill-slate-500 text-[10px] font-mono font-bold"
                >
                  {t.val}
                </text>
              </g>
            ))}

            {/* Label Satuan Sumbu Y */}
            <text
              x={paddingLeft - 8}
              y={paddingTop - 10}
              textAnchor="end"
              className="fill-slate-400 dark:fill-slate-500 text-[9px] font-extrabold uppercase tracking-wider"
            >
              Santri
            </text>

            {/* Area Gradien Di Bawah Garis */}
            {areaPath && <path d={areaPath} fill="url(#evalAreaGradient)" />}

            {/* Garis Utama Line Chart */}
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke="#059669"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="drop-shadow-sm transition-all duration-300"
              />
            )}

            {/* Titik Data (Data Points) & Garis Sumbu X */}
            {points.map((p, i) => {
              const isHovered = hoveredIndex === i;

              // Tampilkan label tanggal setiap selang beberapa titik agar tidak bertumpuk
              const step = points.length > 20 ? 4 : points.length > 10 ? 2 : 1;
              const showLabel = i % step === 0 || i === points.length - 1;

              return (
                <g key={i}>
                  {/* Titik Data Lingkaran */}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isHovered ? 6 : p.santriCount > 0 ? 4 : 2.5}
                    fill={isHovered ? "#10b981" : p.santriCount > 0 ? "#059669" : "#94a3b8"}
                    stroke="#ffffff"
                    strokeWidth={isHovered ? "2.5" : "1.5"}
                    className="cursor-pointer transition-all duration-200"
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />

                  {/* Lingkaran Target Sentuh yang Lebih Besar */}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="12"
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />

                  {/* Label Tanggal Sumbu X */}
                  {showLabel && (
                    <text
                      x={p.x}
                      y={paddingTop + chartH + 18}
                      textAnchor="middle"
                      className={`text-[10px] font-mono transition-colors ${
                        isHovered
                          ? "fill-emerald-600 dark:fill-emerald-400 font-bold"
                          : "fill-slate-500 dark:fill-slate-400"
                      }`}
                    >
                      {p.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        )}
      </div>

      {/* Footer Catatan Penjelasan Sumbu */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-0.5 bg-emerald-600 rounded-full" />
          <span>Garis hijau menunjukkan intensitas santri yang menuntaskan evaluasi per tanggal.</span>
        </div>
        <span className="text-[11px] font-mono">
          Rentang: {data[0]?.label || "-"} s.d. {data[data.length - 1]?.label || "-"}
        </span>
      </div>
    </div>
  );
}
