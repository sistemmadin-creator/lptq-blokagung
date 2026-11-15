import React from "react";
import DatabaseAngkatanModule from "@/components/tahfidz/DatabaseAngkatanModule";
import { KHOTMIL_15_TAHAP } from "@/types/database";

export default function DatabaseAngkatan15Page() {
  return (
    <DatabaseAngkatanModule
      jenis="khotmil15"
      judul="Database Angkatan — Khotmil 15 Juz"
      tahapList={KHOTMIL_15_TAHAP}
    />
  );
}
