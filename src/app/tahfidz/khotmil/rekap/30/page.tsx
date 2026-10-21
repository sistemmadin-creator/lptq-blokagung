import React from "react";
import { RekapKhotmilModule } from "@/components/tahfidz/RekapKhotmilModule";
import { KHOTMIL_30_TAHAP } from "@/types/database";

export default function RekapKhotmil30Page() {
  return (
    <RekapKhotmilModule
      jenis="khotmil30"
      judul="Rekapitulasi Tahfidz Khotmil 30 Juz"
      tahapList={KHOTMIL_30_TAHAP}
    />
  );
}
