"use client";

import React, { useRef, useState } from "react";
import { Upload, Download } from "lucide-react";
import { parseExcelFileWithValidation } from "@/lib/utils/excel";
import { useToast } from "@/components/ui/Toast";

interface ExcelUploaderProps {
  requiredHeaders: string[];
  endpoint: string;
  onSuccess: () => void;
  onDownloadTemplate: () => void;
  buttonLabel?: string;
}

// Memotong array menjadi batch @100 baris agar waktu eksekusi di bawah limit 10s Vercel Serverless
function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export function ExcelUploader({
  requiredHeaders,
  endpoint,
  onSuccess,
  onDownloadTemplate,
  buttonLabel = "Impor Excel / CSV",
}: ExcelUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [progressText, setProgressText] = useState("");
  const { showToast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setProgressText("Memvalidasi header berkas...");

    try {
      const rows = await parseExcelFileWithValidation(file, requiredHeaders);
      const chunks = chunkArray(rows, 100);
      let importedCount = 0;

      for (let idx = 0; idx < chunks.length; idx++) {
        setProgressText(`Mengunggah bagian ${idx + 1} dari ${chunks.length}...`);
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: chunks[idx] }),
        });

        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "Gagal mengimpor data ke server.");
        }
        importedCount += json.count ?? chunks[idx].length;
      }

      showToast("success", `Berhasil mengimpor ${importedCount} baris data.`);
      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal memproses berkas Excel.";
      showToast("error", msg);
    } finally {
      setLoading(false);
      setProgressText("");
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onDownloadTemplate}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
      >
        <Download className="h-4 w-4" />
        <span>Template Excel</span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileChange}
        className="hidden"
      />

      <button
        type="button"
        disabled={loading}
        onClick={() => inputRef.current?.click()}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-emerald-800 px-3.5 py-2 text-sm font-medium text-white hover:bg-emerald-900 disabled:opacity-60"
      >
        <Upload className="h-4 w-4" />
        <span>{loading ? progressText || "Memproses..." : buttonLabel}</span>
      </button>
    </div>
  );
}
