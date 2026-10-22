"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import {
  fetchAppBranding,
  DEFAULT_BRANDING,
  type AppBrandingConfig,
} from "@/lib/services/branding-service";

export default function LoginPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [branding, setBranding] = useState<AppBrandingConfig>(DEFAULT_BRANDING);

  useEffect(() => {
    fetchAppBranding().then(setBranding);
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      if (branding.app_name) {
        document.title = `Masuk - ${branding.app_name}`;
      }
      if (branding.favicon_url) {
        let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
        if (!link) {
          link = document.createElement("link");
          link.rel = "shortcut icon";
          document.head.appendChild(link);
        }
        link.href = branding.favicon_url;
      }
    }
  }, [branding]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMessage("Nama Pengguna dan Kata Sandi wajib diisi.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Gagal melakukan autentikasi.");
      }

      showToast("success", data.message || "Berhasil masuk ke sistem LPTQ Blokagung.");
      router.push("/");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal melakukan autentikasi.";
      setErrorMessage(msg);
      showToast("error", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen w-full flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat transition-all duration-500"
      style={{ backgroundImage: `url('${branding.login_bg_url || "/images/login-bg.jpg"}')` }}
    >
      {/* Overlay atmosferik hijau emerald & gelap untuk keterbacaan kontras tinggi */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-slate-950 via-emerald-950 to-slate-950 backdrop-blur-[2px] transition-opacity duration-300"
        style={{ opacity: branding.login_bg_overlay / 100 }}
      />

      {/* Kartu Login Minimalis Modern */}
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-white/20 bg-white/95 p-6 sm:p-8 shadow-2xl shadow-emerald-950/40 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95">
        
        {/* Baris 1 & 2: LOGO dan LPTQ Blokagung */}
        <div className="flex flex-col items-center justify-center text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-brand-dark text-white flex items-center justify-center shadow-lg shadow-emerald-700/30 mb-3 border border-emerald-400/30 overflow-hidden p-2">
            {branding.logo_url ? (
              <img src={branding.logo_url} alt="Logo LPTQ" className="w-full h-full object-contain" />
            ) : (
              /* Logo Emblem LPTQ */
              <svg
                className="w-8 h-8 text-amber-300"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            {branding.app_name}
          </h1>
        </div>

        {/* Pesan Kesalahan jika ada */}
        {errorMessage && (
          <div className="mb-4 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700 border border-red-200 dark:bg-red-950/50 dark:border-red-900 dark:text-red-300">
            {errorMessage}
          </div>
        )}

        {/* Form Login */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Baris 3: Nama Pengguna */}
          <div>
            <label
              htmlFor="username"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Nama Pengguna
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                id="username"
                type="text"
                required
                autoFocus
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Nama Pengguna"
                className="w-full min-h-[46px] rounded-xl border border-slate-300 bg-slate-50/80 pl-10 pr-3.5 py-2.5 text-sm text-slate-900 focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-slate-700 dark:bg-slate-800/80 dark:text-white dark:focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Baris 4: Kata Sandi */}
          <div>
            <label
              htmlFor="password"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Kata Sandi
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Kata Sandi"
                className="w-full min-h-[46px] rounded-xl border border-slate-300 bg-slate-50/80 pl-10 pr-11 py-2.5 text-sm text-slate-900 focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-slate-700 dark:bg-slate-800/80 dark:text-white dark:focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                title={showPassword ? "Sembunyikan sandi" : "Tampilkan sandi"}
                aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Baris 5: Masuk */}
          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[46px] rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-hover active:scale-[0.99] disabled:opacity-60 transition-all shadow-md shadow-brand/20 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              <span>Masuk</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
