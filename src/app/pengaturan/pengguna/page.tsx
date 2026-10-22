"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PengaturanPenggunaRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/pengaturan?tab=pengguna");
  }, [router]);

  return (
    <div className="min-h-[40vh] flex items-center justify-center text-xs text-slate-400">
      <div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin mr-2" />
      <span>Mengalihkan ke Pengaturan Pengguna...</span>
    </div>
  );
}
