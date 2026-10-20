"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";

export default function LoginPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [magicLinkMode, setMagicLinkMode] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();

    try {
      if (magicLinkMode) {
        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });
        if (error) throw error;
        showToast("success", "Tautan masuk (Magic Link) telah dikirim ke email Anda.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        showToast("success", "Berhasil masuk ke sistem Lptq Blokagung.");
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal melakukan autentikasi.";
      showToast("error", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#f8f9fc] dark:bg-slate-950">
      <div className="w-full max-w-md rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-brand text-white flex items-center justify-center font-extrabold text-xs shadow-sm">
              [LOGO]
            </div>
            <div>
              <span className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white block leading-none">
                Lptq Blokagung
              </span>
              <span className="text-[10px] tracking-widest uppercase font-bold text-brand-dark dark:text-emerald-400">
                Sistem Penilaian Tahfidz
              </span>
            </div>
          </div>

          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Masuk ke Sistem Penilaian Tahfidz
          </h1>
          <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-400">
            Gunakan akun Pengurus, Pembimbing Halaqoh, atau Operator Absensi Anda.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Alamat Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@blokagung.net"
              className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {!magicLinkMode && (
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Kata Sandi
              </label>
              <input
                id="password"
                type="password"
                required={!magicLinkMode}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi akun"
                className="w-full min-h-[44px] rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[44px] rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-hover disabled:opacity-60 transition shadow-sm"
          >
            {loading
              ? "Memproses..."
              : magicLinkMode
              ? "Kirim Tautan Masuk ke Email"
              : "Masuk dengan Kata Sandi"}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800 text-center">
          <button
            type="button"
            onClick={() => setMagicLinkMode((prev) => !prev)}
            className="min-h-[44px] text-xs font-bold text-brand-dark hover:underline dark:text-emerald-400"
          >
            {magicLinkMode
              ? "Gunakan Email dan Kata Sandi"
              : "Masuk tanpa kata sandi (Kirim Magic Link)"}
          </button>
        </div>
      </div>
    </div>
  );
}
