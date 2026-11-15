import React from "react";
import DatabaseAngkatanModule from "@/components/tahfidz/DatabaseAngkatanModule";
import { KHOTMIL_30_TAHAP } from "@/types/database";

export default function DatabaseAngkatan30Page() {
  return (
    <DatabaseAngkatanModule
      jenis="khotmil30"
      judul="Database Angkatan — Khotmil 30 Juz"
      tahapList={KHOTMIL_30_TAHAP}
    />
  );
}
