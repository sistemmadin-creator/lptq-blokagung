import React from "react";
import { KhotmilModule } from "@/components/tahfidz/KhotmilModule";
import { KHOTMIL_15_TAHAP } from "@/types/database";

export default function Khotmil15Page() {
  return (
    <KhotmilModule
      jenis="khotmil15"
      judul="Tahfidz Khotmil 15 Juz"
      tahapList={KHOTMIL_15_TAHAP}
    />
  );
}
