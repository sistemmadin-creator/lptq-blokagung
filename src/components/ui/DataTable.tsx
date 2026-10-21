"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type VisibilityState,
} from "@tanstack/react-table";
import {
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  RefreshCw,
  Trash2,
  ChevronDown,
  AlertTriangle,
  X,
  Check,
} from "lucide-react";

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
  pageSizeOptions?: number[];
  totalCount?: number;
  onPageChange?: (newPage: number) => void;
  onPageSizeChange?: (newPageSize: number) => void;
  onRowClick?: (row: TData) => void;

  // Fitur Select & Hapus Massal
  enableSelection?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  getRowId?: (row: TData) => string;
  onDeleteSelected?: (selectedIds: string[], selectedRows: TData[]) => Promise<void> | void;
  onDeleteAll?: () => Promise<void> | void;
}

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 4) {
    return [1, 2, 3, 4, 5, "...", total];
  }
  if (current >= total - 3) {
    return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  }
  return [1, "...", current - 1, current, current + 1, "...", total];
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
  pageSize = 15,
  pageSizeOptions = [10, 15, 25, 50],
  totalCount,
  onPageChange,
  onPageSizeChange,
  onRowClick,
  enableSelection = true,
  selectedIds: controlledSelectedIds,
  onSelectionChange,
  getRowId = (row: any) => row.id || row.kode || String(row.no_urut || ""),
  onDeleteSelected,
  onDeleteAll,
}: DataTableProps<TData>) {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [showColMenu, setShowColMenu] = useState(false);
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);

  // State pagination internal jika tidak dikontrol secara eksternal
  const [internalPage, setInternalPage] = useState(1);
  const [internalPageSize, setInternalPageSize] = useState(pageSize || 15);

  const isControlled = onPageChange !== undefined;
  const activePage = isControlled ? (page || 1) : internalPage;
  const activePageSize = isControlled ? (pageSize || 15) : internalPageSize;
  const effectiveTotal = isControlled
    ? typeof totalCount === "number"
      ? totalCount
      : data.length
    : data.length;
  const totalPages = Math.max(1, Math.ceil(effectiveTotal / activePageSize));

  const displayData = useMemo(() => {
    if (isControlled) return data;
    const start = (activePage - 1) * activePageSize;
    return data.slice(start, start + activePageSize);
  }, [data, isControlled, activePage, activePageSize]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    if (isControlled) {
      onPageChange?.(newPage);
    } else {
      setInternalPage(newPage);
    }
  };

  const handlePageSizeChange = (newSize: number) => {
    if (onPageSizeChange) {
      onPageSizeChange(newSize);
    } else {
      setInternalPageSize(newSize);
      setInternalPage(1);
    }
  };

  // State seleksi baris (internal jika tidak di-control dari luar)
  const [internalSelectedIds, setInternalSelectedIds] = useState<string[]>([]);
  const selectedIds = controlledSelectedIds !== undefined ? controlledSelectedIds : internalSelectedIds;

  const updateSelected = useCallback((newIds: string[]) => {
    if (controlledSelectedIds === undefined) {
      setInternalSelectedIds(newIds);
    }
    onSelectionChange?.(newIds);
  }, [controlledSelectedIds, onSelectionChange]);

  // State modal konfirmasi hapus terpilih
  const [showDeleteSelectedModal, setShowDeleteSelectedModal] = useState(false);
  const [isDeletingSelected, setIsDeletingSelected] = useState(false);

  // State modal konfirmasi 2 tahap untuk hapus semua
  const [deleteAllStep, setDeleteAllStep] = useState<0 | 1 | 2>(0);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  // Cek apakah seluruh baris di halaman aktif ini terpilih
  const isAllCurrentPageSelected = useMemo(() => {
    if (data.length === 0) return false;
    return data.every((row) => selectedIds.includes(getRowId(row)));
  }, [data, selectedIds, getRowId]);

  const handleToggleSelectAll = useCallback(() => {
    const currentPageIds = data.map((row) => getRowId(row));
    if (isAllCurrentPageSelected) {
      // Unselect semua baris di halaman ini
      const remaining = selectedIds.filter((id) => !currentPageIds.includes(id));
      updateSelected(remaining);
    } else {
      // Select semua baris di halaman ini
      const merged = Array.from(new Set([...selectedIds, ...currentPageIds]));
      updateSelected(merged);
    }
  }, [data, getRowId, isAllCurrentPageSelected, selectedIds, updateSelected]);

  const handleToggleRow = useCallback((id: string, e: React.MouseEvent | React.ChangeEvent) => {
    e.stopPropagation();
    if (selectedIds.includes(id)) {
      updateSelected(selectedIds.filter((item) => item !== id));
    } else {
      updateSelected([...selectedIds, id]);
    }
  }, [selectedIds, updateSelected]);

  // Kolom lengkap dengan kolom checkbox jika enableSelection = true
  const tableColumns = useMemo(() => {
    if (!enableSelection) return columns;

    const selectColumn: ColumnDef<TData, unknown> = {
      id: "select",
      header: () => (
        <div className="flex items-center justify-center">
          <input
            type="checkbox"
            checked={isAllCurrentPageSelected}
            onChange={handleToggleSelectAll}
            aria-label="Pilih semua baris halaman ini"
            className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-500 cursor-pointer"
          />
        </div>
      ),
      cell: ({ row }) => {
        const id = getRowId(row.original);
        const isSelected = selectedIds.includes(id);
        return (
          <div
            className="flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => handleToggleRow(id, e)}
              aria-label={`Pilih baris ${id}`}
              className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-500 cursor-pointer"
            />
          </div>
        );
      },
      enableHiding: false,
    };

    return [selectColumn, ...columns];
  }, [enableSelection, columns, isAllCurrentPageSelected, selectedIds, getRowId, handleToggleSelectAll, handleToggleRow]);

  const table = useReactTable({
    data: displayData,
    columns: tableColumns,
    state: { columnVisibility },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
  });

  // Eksekusi hapus terpilih
  const handleConfirmDeleteSelected = async () => {
    if (!onDeleteSelected) return;
    setIsDeletingSelected(true);
    try {
      const selectedRows = data.filter((row) => selectedIds.includes(getRowId(row)));
      await onDeleteSelected(selectedIds, selectedRows);
      updateSelected([]);
      setShowDeleteSelectedModal(false);
    } finally {
      setIsDeletingSelected(false);
    }
  };

  // Eksekusi hapus semua (setelah melewati 2 tahap konfirmasi)
  const handleConfirmDeleteAll = async () => {
    if (!onDeleteAll) return;
    setIsDeletingAll(true);
    try {
      await onDeleteAll();
      updateSelected([]);
      setDeleteAllStep(0);
      setDeleteConfirmationText("");
    } finally {
      setIsDeletingAll(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
      {/* Bilah Atas Tabel: Jumlah Baris di Kiri, Tombol Hapus & Kolom di Kanan */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
          <span>
            {typeof totalCount === "number"
              ? `Menampilkan ${data.length} dari total ${totalCount} baris data`
              : `Total ${data.length} baris data`}
          </span>
          {enableSelection && selectedIds.length > 0 && (
            <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-xs font-bold border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
              {selectedIds.length} baris dipilih
            </span>
          )}
        </div>

        {/* Grup Tombol: [ Hapus (Dropdown) ] [ Tampilkan/Sembunyikan Kolom ] */}
        <div className="flex items-center gap-2">
          {/* Tombol Hapus (Dropdown: Hapus Terpilih & Hapus Semua) */}
          {(onDeleteSelected || onDeleteAll) && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDeleteMenu((prev) => !prev)}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition shadow-sm dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/50"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                <span>Hapus</span>
                {selectedIds.length > 0 && (
                  <span className="rounded-full bg-rose-600 px-1.5 py-0.2 text-[10px] font-extrabold text-white">
                    {selectedIds.length}
                  </span>
                )}
                <ChevronDown className="h-3.5 w-3.5 opacity-70" />
              </button>

              {showDeleteMenu && (
                <div className="absolute right-0 mt-1.5 z-40 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-150">
                  {onDeleteSelected && (
                    <button
                      type="button"
                      disabled={selectedIds.length === 0}
                      onClick={() => {
                        setShowDeleteMenu(false);
                        setShowDeleteSelectedModal(true);
                      }}
                      className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-40 disabled:hover:bg-transparent text-left transition dark:text-rose-400 dark:hover:bg-rose-950/40"
                    >
                      <Trash2 className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        Hapus Terpilih {selectedIds.length > 0 ? `(${selectedIds.length})` : ""}
                      </span>
                    </button>
                  )}

                  {onDeleteSelected && onDeleteAll && (
                    <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                  )}

                  {onDeleteAll && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowDeleteMenu(false);
                        setDeleteAllStep(1);
                        setDeleteConfirmationText("");
                      }}
                      className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-rose-800 hover:bg-rose-100 text-left transition dark:text-rose-300 dark:hover:bg-rose-900/50"
                    >
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-rose-600" />
                      <span>Hapus Semua Data</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tombol Tampilkan / Sembunyikan Kolom */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowColMenu((prev) => !prev)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 shadow-sm"
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              <span>Tampilkan / Sembunyikan Kolom</span>
            </button>

            {showColMenu && (
              <div className="absolute right-0 mt-1.5 z-30 w-56 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-lg dark:border-slate-700 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-150">
                <p className="mb-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                  Pilih Kolom Tabel
                </p>
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {table.getAllLeafColumns().map((column) => {
                    if (column.id === "select") return null;
                    return (
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
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabel Utama */}
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
              {table.getRowModel().rows.map((row) => {
                const id = getRowId(row.original);
                const isSelected = selectedIds.includes(id);

                return (
                  <tr
                    key={row.id}
                    onClick={() => onRowClick?.(row.original)}
                    className={`transition-colors ${
                      isSelected
                        ? "bg-emerald-50/70 dark:bg-emerald-950/30"
                        : onRowClick
                        ? "cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/50"
                        : "hover:bg-slate-50/80 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-3.5 py-3 whitespace-nowrap">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Bar Terpadu (10, 15, 25, 50 & Tombol Halaman 1, 2, 3...) */}
      {effectiveTotal > 0 && (
        <div className="no-print flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex flex-wrap items-center gap-2">
            <span>Tampilkan</span>
            <select
              value={activePageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              aria-label="Pilih jumlah baris per halaman"
              className="h-8 rounded-xl border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-800 shadow-xs focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span>baris per halaman</span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span>
              Menampilkan{" "}
              <strong className="text-slate-900 dark:text-white">
                {(activePage - 1) * activePageSize + 1}
              </strong>{" "}
              -{" "}
              <strong className="text-slate-900 dark:text-white">
                {Math.min(activePage * activePageSize, effectiveTotal)}
              </strong>{" "}
              dari <strong className="text-slate-900 dark:text-white">{effectiveTotal}</strong> baris data
            </span>
          </div>

          <div className="flex items-center gap-1 font-semibold">
            <button
              type="button"
              disabled={activePage <= 1}
              onClick={() => handlePageChange(activePage - 1)}
              title="Halaman Sebelumnya"
              className="inline-flex h-8 px-2.5 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {getPageNumbers(activePage, totalPages).map((p, idx) =>
              p === "..." ? (
                <span key={`ell-${idx}`} className="px-1 text-slate-400 select-none">
                  ...
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => handlePageChange(Number(p))}
                  className={`h-8 min-w-[32px] px-2 rounded-xl font-mono text-xs transition ${
                    activePage === p
                      ? "bg-emerald-800 text-white font-bold shadow-xs"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  {p}
                </button>
              )
            )}
            <button
              type="button"
              disabled={activePage >= totalPages}
              onClick={() => handlePageChange(activePage + 1)}
              title="Halaman Berikutnya"
              className="inline-flex h-8 px-2.5 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: KONFIRMASI HAPUS TERPILIH                                        */}
      {/* ========================================================================= */}
      {showDeleteSelectedModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Hapus Data Terpilih
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tindakan ini akan menghapus baris data yang Anda centang
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 mb-5 leading-relaxed">
              Apakah Anda yakin ingin menghapus{" "}
              <strong className="text-rose-600 font-bold">{selectedIds.length} baris</strong>{" "}
              data yang dipilih? Data yang telah dihapus tidak dapat dikembalikan.
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={isDeletingSelected}
                onClick={() => setShowDeleteSelectedModal(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 transition dark:border-slate-700 dark:text-slate-300"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeletingSelected}
                onClick={handleConfirmDeleteSelected}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition shadow disabled:opacity-50"
              >
                {isDeletingSelected ? "Menghapus..." : `Ya, Hapus ${selectedIds.length} Data`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: KONFIRMASI 2 KALI HAPUS SEMUA DATA                               */}
      {/* ========================================================================= */}
      {deleteAllStep === 1 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl border border-amber-300 bg-white p-6 shadow-2xl dark:border-amber-800 dark:bg-slate-900">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 mb-1">
                  Konfirmasi Tahap 1 dari 2
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Peringatan: Hapus Semua Data
                </h3>
              </div>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 mb-5 leading-relaxed">
              Anda memilih untuk menghapus{" "}
              <strong className="text-rose-600 font-bold">
                SELURUH DATA ({typeof totalCount === "number" ? totalCount : data.length} baris)
              </strong>
              . Tindakan ini akan mengosongkan seluruh isi tabel ini. Apakah Anda yakin ingin
              melanjutkan ke tahap konfirmasi akhir?
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteAllStep(0)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 transition dark:border-slate-700 dark:text-slate-300"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => setDeleteAllStep(2)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-600 text-white hover:bg-amber-700 transition shadow"
              >
                Lanjutkan ke Konfirmasi Akhir (2/2) &gt;
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteAllStep === 2 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl border-2 border-rose-600 bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-600 text-white">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <span className="inline-block rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800 mb-1">
                  Konfirmasi Terakhir (Tahap 2 dari 2)
                </span>
                <h3 className="text-base font-extrabold text-rose-700 dark:text-rose-400">
                  PERINGATAN PERMANEN
                </h3>
              </div>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 mb-3 leading-relaxed">
              Tindakan ini bersifat <strong>PERMANEN</strong> dan <strong>TIDAK DAPAT DIBATALKAN</strong>.
              Seluruh data akan dihapus dari sistem.
            </p>

            <div className="mb-5 space-y-1.5 bg-rose-50 p-3 rounded-xl border border-rose-200 dark:bg-rose-950/40 dark:border-rose-900">
              <label className="block text-[11px] font-bold text-rose-900 dark:text-rose-200">
                Ketik teks <span className="font-mono underline">HAPUS</span> untuk mengonfirmasi:
              </label>
              <input
                type="text"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value.toUpperCase())}
                placeholder="Ketik HAPUS di sini..."
                className="w-full h-9 rounded-lg border border-rose-300 bg-white px-2.5 text-xs font-mono font-bold text-rose-900 uppercase focus:outline-none focus:ring-2 focus:ring-rose-500 dark:bg-slate-800 dark:text-rose-200"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={isDeletingAll}
                onClick={() => {
                  setDeleteAllStep(0);
                  setDeleteConfirmationText("");
                }}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 transition dark:border-slate-700 dark:text-slate-300"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deleteConfirmationText !== "HAPUS" || isDeletingAll}
                onClick={handleConfirmDeleteAll}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-700 text-white hover:bg-rose-800 transition shadow disabled:opacity-40"
              >
                {isDeletingAll ? "Menghapus Semua..." : "Ya, Hapus Seluruh Data Sekarang"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
