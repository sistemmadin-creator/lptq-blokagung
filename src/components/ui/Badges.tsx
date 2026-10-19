import React from "react";
import { PEMETAAN_HALAQOH_KELAS, type StatusAbsen } from "@/types/database";

export function HalaqohBadge({
  kelas,
  bagian,
  showMapping = false,
}: {
  kelas: number;
  bagian: string;
  showMapping?: boolean;
}) {
  const kode = `${kelas}${bagian}`;
  const targetJuz = PEMETAAN_HALAQOH_KELAS[kelas] ?? "";

  return (
    <span className="inline-flex items-center gap-1.5 rounded border border-emerald-700 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-900 dark:border-emerald-500 dark:bg-emerald-950 dark:text-emerald-200">
      <span>{kode}</span>
      {showMapping && targetJuz && (
        <span className="text-[11px] font-normal text-emerald-800 dark:text-emerald-300">
          ({targetJuz})
        </span>
      )}
    </span>
  );
}

export function StatusChip({ status }: { status: StatusAbsen }) {
  const styles: Record<StatusAbsen, { label: string; kode: string; cls: string }> = {
    hadir: {
      label: "Hadir",
      kode: "H",
      cls: "border-emerald-700 bg-emerald-100 text-emerald-900 dark:border-emerald-500 dark:bg-emerald-950 dark:text-emerald-200",
    },
    alfa: {
      label: "Alfa",
      kode: "A",
      cls: "border-red-700 bg-red-100 text-red-900 dark:border-red-500 dark:bg-red-950 dark:text-red-200",
    },
    izin: {
      label: "Izin",
      kode: "I",
      cls: "border-amber-700 bg-amber-100 text-amber-900 dark:border-amber-500 dark:bg-amber-950 dark:text-amber-200",
    },
    sakit: {
      label: "Sakit",
      kode: "S",
      cls: "border-sky-700 bg-sky-100 text-sky-900 dark:border-sky-500 dark:bg-sky-950 dark:text-sky-200",
    },
  };

  const item = styles[status];
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-semibold ${item.cls}`}
    >
      {item.kode} - {item.label}
    </span>
  );
}

export function KkmBadge({
  rataRata,
  lengkap,
  kkm = 85,
}: {
  rataRata: number | null;
  lengkap: boolean;
  kkm?: number;
}) {
  if (rataRata === null || !lengkap) {
    return (
      <span className="inline-flex items-center rounded border border-red-700 bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-900 dark:border-red-500 dark:bg-red-950 dark:text-red-200">
        Belum Tuntas (Nilai Belum Lengkap)
      </span>
    );
  }

  const lulus = rataRata >= kkm;
  return lulus ? (
    <span className="inline-flex items-center rounded border border-emerald-700 bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-900 dark:border-emerald-500 dark:bg-emerald-950 dark:text-emerald-200">
      Tuntas / Lulus
    </span>
  ) : (
    <span className="inline-flex items-center rounded border border-red-700 bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-900 dark:border-red-500 dark:bg-red-950 dark:text-red-200">
      Belum Tuntas
    </span>
  );
}
