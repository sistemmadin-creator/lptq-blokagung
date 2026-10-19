"use client";

import React from "react";
import { useReactToPrint } from "react-to-print";
import { Printer } from "lucide-react";

interface PrintButtonProps {
  contentRef: React.RefObject<HTMLElement>;
  documentTitle: string;
  label?: string;
}

export function PrintButton({
  contentRef,
  documentTitle,
  label = "Cetak / Unduh PDF",
}: PrintButtonProps) {
  const handlePrint = useReactToPrint({
    content: () => contentRef.current,
    documentTitle,
  });

  return (
    <button
      type="button"
      onClick={handlePrint}
      className="no-print inline-flex min-h-[44px] items-center gap-2 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
    >
      <Printer className="h-4 w-4" />
      <span>{label}</span>
    </button>
  );
}
