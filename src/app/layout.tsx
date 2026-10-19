import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { AppShell } from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "Lptq Blokagung - Sistem Penilaian Tahfidz Santri",
  description:
    "Aplikasi penilaian absensi kegiatan, setoran juz baru, evaluasi, dan khotmil 15/30 juz santri LPTQ Blokagung.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body>
        <ToastProvider>
          <AppShell>{children}</AppShell>
        </ToastProvider>
      </body>
    </html>
  );
}
