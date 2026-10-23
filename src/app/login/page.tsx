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

      {/* Kartu Login Minimalis Modern - Glassmorphism Dinamis */}
      <div
        className="relative z-10 w-full max-w-sm rounded-3xl border border-white/50 p-6 sm:p-8 shadow-[0_8px_32px_0_rgba(0,0,0,0.28)] backdrop-blur-xl dark:border-white/10 dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] transition-all duration-300"
        style={{
          backgroundColor: `rgba(255, 255, 255, ${(branding.login_card_opacity ?? 60) / 100})`,
        }}
      >
        
        {/* Baris 1 & 2: LOGO dan LPTQ Blokagung */}
        <div className="flex flex-col items-center justify-center text-center mb-6">
          <div className="flex items-center justify-center mb-2">
            {branding.logo_url ? (
              <img
                src={branding.logo_url}
                alt="Logo LPTQ"
                className="w-40 h-40 object-contain drop-shadow-md select-none transition-transform duration-300 hover:scale-105"
              />
            ) : (
              /* Logo Emblem LPTQ (Default) */
              <div className="w-36 h-36 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
                <svg
                  className="w-28 h-28 drop-shadow-md"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
              </div>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white drop-shadow-sm">
            {branding.app_name}
          </h1>
        </div>

        {/* Pesan Kesalahan jika ada */}
        {errorMessage && (
          <div className="mb-4 rounded-xl bg-red-500/10 p-3 text-xs font-semibold text-red-800 border border-red-300/60 backdrop-blur-md dark:bg-red-950/50 dark:border-red-900 dark:text-red-300">
            {errorMessage}
          </div>
        )}

        {/* Form Login */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Baris 3: Nama Pengguna */}
          <div>
            <label
              htmlFor="username"
              className="block text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-1.5"
            >
              Nama Pengguna
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500 dark:text-slate-400">
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
                className="w-full min-h-[46px] rounded-xl border border-white/60 bg-white/70 pl-10 pr-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 shadow-inner focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-slate-700/80 dark:bg-slate-800/70 dark:text-white dark:focus:border-emerald-500 transition"
              />
            </div>
          </div>

          {/* Baris 4: Kata Sandi */}
          <div>
            <label
              htmlFor="password"
              className="block text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-1.5"
            >
              Kata Sandi
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500 dark:text-slate-400">
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
                className="w-full min-h-[46px] rounded-xl border border-white/60 bg-white/70 pl-10 pr-11 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 shadow-inner focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-slate-700/80 dark:bg-slate-800/70 dark:text-white dark:focus:border-emerald-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
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
            className="w-full min-h-[46px] rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 px-4 py-2.5 text-sm font-bold text-white hover:from-emerald-700 hover:to-teal-800 active:scale-[0.99] disabled:opacity-60 transition-all shadow-lg shadow-emerald-800/30 flex items-center justify-center gap-2"
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
