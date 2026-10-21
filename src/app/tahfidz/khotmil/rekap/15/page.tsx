import React from "react";
import { RekapKhotmilModule } from "@/components/tahfidz/RekapKhotmilModule";
import { KHOTMIL_15_TAHAP } from "@/types/database";

export default function RekapKhotmil15Page() {
  return (
    <RekapKhotmilModule
      jenis="khotmil15"
      judul="Rekapitulasi Tahfidz Khotmil 15 Juz"
      tahapList={KHOTMIL_15_TAHAP}
    />
  );
}
