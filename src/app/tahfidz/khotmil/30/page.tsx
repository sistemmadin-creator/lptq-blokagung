import React from "react";
import { KhotmilModule } from "@/components/tahfidz/KhotmilModule";
import { KHOTMIL_30_TAHAP } from "@/types/database";

export default function Khotmil30Page() {
  return (
    <KhotmilModule
      jenis="khotmil30"
      judul="Tahfidz Khotmil 30 Juz"
      tahapList={KHOTMIL_30_TAHAP}
    />
  );
}
