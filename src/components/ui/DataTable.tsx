"use client";

import React, { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type VisibilityState,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, SlidersHorizontal, RefreshCw } from "lucide-react";

interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  page?: number;
  pageSize?: number;
  totalCount?: number;
  onPageChange?: (newPage: number) => void;
  onRowClick?: (row: TData) => void;
}

export function DataTable<TData>({
  columns,
  data,
  loading,
  error,
  onRetry,
  emptyTitle = "Belum ada data tercatat",
  emptyDescription = "Gunakan tombol Tambah atau Impor Excel di atas untuk mulai mengisi data.",
  page = 1,
  pageSize = 25,
  totalCount,
  onPageChange,
  onRowClick,
}: DataTableProps<TData>) {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [showColMenu, setShowColMenu] = useState(false);

  const table = useReactTable({
    data,
    columns,
    state: { columnVisibility },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
  });

  const totalPages =
    typeof totalCount === "number" ? Math.max(1, Math.ceil(totalCount / pageSize)) : 1;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">
          {typeof totalCount === "number"
            ? `Menampilkan ${data.length} dari total ${totalCount} baris data`
            : `Total ${data.length} baris data`}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowColMenu((prev) => !prev)}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            <span>Tampilkan / Sembunyikan Kolom</span>
          </button>

          {showColMenu && (
            <div className="absolute right-0 mt-1.5 z-30 w-56 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-lg dark:border-slate-700 dark:bg-slate-900">
              <p className="mb-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                Pilih Kolom Tabel
              </p>
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {table.getAllLeafColumns().map((column) => (
                  <label
                    key={column.id}
                    className="flex items-center gap-2 text-xs text-slate-800 dark:text-slate-200 cursor-pointer py-1"
                  >
                    <input
                      type="checkbox"
                      checked={column.getIsVisible()}
                      onChange={column.getToggleVisibilityHandler()}
                      className="h-4 w-4 rounded border-slate-300 text-brand"
                    />
                    <span>{String(column.columnDef.header ?? column.id)}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center" role="status">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Memuat data dari server...
            </p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              Mohon tunggu sebentar, sedang mengambil daftar terbaru.
            </p>
          </div>
        ) : error ? (
          <div className="p-8 text-center space-y-3" role="alert">
            <p className="text-sm font-bold text-red-800 dark:text-red-300">
              Gagal memuat data: {error}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Periksa koneksi internet atau izin akses peran akun Anda, lalu coba muat ulang.
            </p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white hover:bg-brand-hover"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                <span>Muat Ulang Data</span>
              </button>
            )}
          </div>
        ) : data.length === 0 ? (
          <div className="p-8 text-center space-y-1">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{emptyTitle}</p>
            <p className="text-xs text-slate-600 dark:text-slate-400">{emptyDescription}</p>
          </div>
        ) : (
          <table className="w-full border-collapse text-left text-xs sm:text-sm">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr
                  key={headerGroup.id}
                  className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400"
                >
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="px-3.5 py-3 whitespace-nowrap">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick?.(row.original)}
                  className={`transition-colors ${
                    onRowClick
                      ? "cursor-pointer hover:bg-emerald-50/60 dark:hover:bg-emerald-950/20"
                      : "hover:bg-slate-50/80 dark:hover:bg-slate-800/50"
                  }`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3.5 py-3 whitespace-nowrap">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {onPageChange && typeof totalCount === "number" && totalCount > 0 && (
        <div className="no-print flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
          <span>
            Halaman <strong className="text-slate-900 dark:text-white">{page}</strong> dari{" "}
            <strong className="text-slate-900 dark:text-white">{totalPages}</strong>
          </span>
          <div className="flex items-center gap-1.5 font-bold">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="inline-flex min-h-[40px] items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              <span>Sebelumnya</span>
            </button>
            <span className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl bg-brand text-white text-xs font-mono">
              {page}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="inline-flex min-h-[40px] items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 disabled:opacity-50"
            >
              <span>Berikutnya</span>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
