import React from "react";
import type { Metadata } from "next";
import { KirimWaModule } from "@/components/wa/KirimWaModule";

export const metadata: Metadata = {
  title: "Kirim WA Evaluasi & Khotmil | LPTQ Pondok Pesantren Darussalam Blokagung",
  description:
    "Pemberitahuan hasil evaluasi hafalan dan nilai khotmil santri via WhatsApp secara otomatis dan broadcast massal.",
};

export default function KirimWaPage() {
  return <KirimWaModule />;
}
