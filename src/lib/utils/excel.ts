import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import {
  loadHierarchyRules,
  extractHierarchyEnums,
  DEFAULT_HIERARCHY_RULES,
  type HierarchyRule,
} from "@/lib/services/hierarchy-service";
import {
  loadHalaqohFormasi,
  DEFAULT_FORMASI_HALAQOH,
} from "@/lib/services/halaqoh-service";
import { PEMETAAN_HALAQOH_KELAS } from "@/types/database";

export function exportJsonToExcel<T extends Record<string, unknown>>(
  rows: T[],
  fileName: string,
  sheetName = "Data"
) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}

/**
 * Mengunduh template Excel santri lengkap dengan enum & fitur Data Validation
 * (Dropdown / Ketik dan Pilih) untuk kolom Blok, Asrama, Kode, Kamar, Halaqoh Kelas, dan Halaqoh Bagian.
 */
export async function downloadSantriTemplateExcel(customRules?: HierarchyRule[]) {
  // 1. Dapatkan aturan hierarki dan formasi halaqoh terkini
  let rules = customRules;
  if (!rules || rules.length === 0) {
    try {
      rules = await loadHierarchyRules();
    } catch {
      rules = DEFAULT_HIERARCHY_RULES;
    }
  }
  if (!rules || rules.length === 0) rules = DEFAULT_HIERARCHY_RULES;

  let formasi;
  try {
    formasi = await loadHalaqohFormasi();
  } catch {
    formasi = DEFAULT_FORMASI_HALAQOH;
  }
  if (!formasi || formasi.length === 0) formasi = DEFAULT_FORMASI_HALAQOH;

  const { bloks, asramas, kodes, kamars, combinations, routes } = extractHierarchyEnums(rules);

  const kelasList = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const bagianSet = new Set<string>();
  formasi.forEach((f) => {
    if (f.bagian) bagianSet.add(String(f.bagian).trim().toUpperCase());
  });
  ["A", "B", "C", "D", "E", "F"].forEach((b) => bagianSet.add(b));
  const bagianList = Array.from(bagianSet).sort();

  // 2. Buat Workbook ExcelJS
  const wb = new ExcelJS.Workbook();
  wb.creator = "LPTQ Pondok Pesantren Darussalam Blokagung";
  wb.created = new Date();

  // SHEET 1: Form Template Santri
  const ws = wb.addWorksheet("TemplateSantri", {
    views: [{ showGridLines: true }],
  });

  ws.columns = [
    { header: "Nama Lengkap", key: "nama_lengkap", width: 28 },
    { header: "Nomor WhatsApp", key: "no_wa", width: 18 },
    { header: "Penempatan Kamar (Hierarki)", key: "hierarki", width: 38 },
    { header: "Blok", key: "blok", width: 16 },
    { header: "Asrama", key: "asrama", width: 25 },
    { header: "Kode", key: "kode", width: 14 },
    { header: "Kamar", key: "kamar", width: 14 },
    { header: "Halaqoh Kelas", key: "halaqoh_kelas", width: 16 },
    { header: "Halaqoh Bagian", key: "halaqoh_bagian", width: 16 },
  ];

  // Desain Header Emerald LPTQ
  const headerRow = ws.getRow(1);
  headerRow.height = 30;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF065F46" }, // Emerald 800
    };
    cell.font = {
      name: "Calibri",
      size: 11,
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      top: { style: "thin", color: { argb: "FF047857" } },
      bottom: { style: "medium", color: { argb: "FF022C22" } },
      left: { style: "thin", color: { argb: "FF047857" } },
      right: { style: "thin", color: { argb: "FF047857" } },
    };
  });

  // Contoh data baris 2 & 3 sesuai data riil hierarki Blokagung
  const sampleRoute1 = routes[0] || "Blok 12 > Maqomin Amin > AB";
  const sampleParts1 = sampleRoute1.split(">").map((s) => s.trim());
  const r2 = ws.getRow(2);
  r2.getCell(1).value = "Ahmad Fauzi Darussalam";
  r2.getCell(2).value = "085289039180";
  r2.getCell(3).value = sampleRoute1;
  r2.getCell(4).value = {
    formula: `IF(C2="","",TRIM(MID(SUBSTITUTE(C2,">",REPT(" ",100)),1,100)))`,
    result: sampleParts1[0] || "Blok 12",
  };
  r2.getCell(5).value = {
    formula: `IF(C2="","",TRIM(MID(SUBSTITUTE(C2,">",REPT(" ",100)),101,100)))`,
    result: sampleParts1[1] || "Maqomin Amin",
  };
  r2.getCell(6).value = {
    formula: `IF(C2="","",TRIM(MID(SUBSTITUTE(C2,">",REPT(" ",100)),201,100)))`,
    result: sampleParts1[2] || "AB",
  };
  r2.getCell(7).value = "1";
  r2.getCell(8).value = 1;
  r2.getCell(9).value = "A";

  const sampleRoute2 = routes[4] || routes[1] || "Blok 11 > Al Multazam > HA";
  const sampleParts2 = sampleRoute2.split(">").map((s) => s.trim());
  const r3 = ws.getRow(3);
  r3.getCell(1).value = "Muhammad Rizky Pratama";
  r3.getCell(2).value = "081234567890";
  r3.getCell(3).value = sampleRoute2;
  r3.getCell(4).value = {
    formula: `IF(C3="","",TRIM(MID(SUBSTITUTE(C3,">",REPT(" ",100)),1,100)))`,
    result: sampleParts2[0] || "Blok 11",
  };
  r3.getCell(5).value = {
    formula: `IF(C3="","",TRIM(MID(SUBSTITUTE(C3,">",REPT(" ",100)),101,100)))`,
    result: sampleParts2[1] || "Al Multazam",
  };
  r3.getCell(6).value = {
    formula: `IF(C3="","",TRIM(MID(SUBSTITUTE(C3,">",REPT(" ",100)),201,100)))`,
    result: sampleParts2[2] || "HA",
  };
  r3.getCell(7).value = "2";
  r3.getCell(8).value = 2;
  r3.getCell(9).value = "B";

  // SHEET 2: Referensi Enum & Hierarki (Sumber validasi dropdown dan panduan)
  const refWs = wb.addWorksheet("Referensi_Enum", {
    views: [{ showGridLines: true }],
  });

  // Header Referensi Enum
  refWs.getCell("A1").value = "Daftar Blok";
  refWs.getCell("B1").value = "Daftar Asrama";
  refWs.getCell("C1").value = "Daftar Kode";
  refWs.getCell("D1").value = "Daftar Kamar";
  refWs.getCell("E1").value = "Halaqoh Kelas";
  refWs.getCell("F1").value = "Halaqoh Bagian";
  refWs.getCell("G1").value = "Rute Hierarki (Blok > Asrama > Kode)";

  refWs.getCell("I1").value = "Blok (Hierarki)";
  refWs.getCell("J1").value = "Asrama (Hierarki)";
  refWs.getCell("K1").value = "Kode (Hierarki)";
  refWs.getCell("L1").value = "Daftar Kamar Valid";

  refWs.getCell("N1").value = "Kelas";
  refWs.getCell("O1").value = "Target Hafalan Juz";

  // Isi data enum kolom A - G
  bloks.forEach((b, i) => {
    refWs.getCell(`A${i + 2}`).value = b;
  });
  asramas.forEach((a, i) => {
    refWs.getCell(`B${i + 2}`).value = a;
  });
  kodes.forEach((k, i) => {
    refWs.getCell(`C${i + 2}`).value = k;
  });
  kamars.forEach((km, i) => {
    const c = refWs.getCell(`D${i + 2}`);
    c.value = km;
    c.numFmt = "@";
  });
  kelasList.forEach((kl, i) => {
    refWs.getCell(`E${i + 2}`).value = kl;
  });
  bagianList.forEach((bg, i) => {
    refWs.getCell(`F${i + 2}`).value = bg;
  });
  routes.forEach((rt, i) => {
    refWs.getCell(`G${i + 2}`).value = rt;
  });

  // Isi data kombinasi hierarki kolom I - L
  combinations.forEach((comb, i) => {
    refWs.getCell(`I${i + 2}`).value = comb.blok;
    refWs.getCell(`J${i + 2}`).value = comb.asrama;
    refWs.getCell(`K${i + 2}`).value = comb.kode;
    refWs.getCell(`L${i + 2}`).value = comb.kamarList.join(", ");
  });

  // Isi target juz kelas kolom N - O
  kelasList.forEach((kl, i) => {
    refWs.getCell(`N${i + 2}`).value = `Kelas ${kl}`;
    refWs.getCell(`O${i + 2}`).value = PEMETAAN_HALAQOH_KELAS[kl] || "-";
  });

  // Format header Sheet Referensi
  const refHeader = refWs.getRow(1);
  refHeader.height = 26;
  refHeader.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF334155" }, // Slate 700
    };
    cell.font = {
      name: "Calibri",
      size: 11,
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });

  // Atur lebar kolom Referensi_Enum
  refWs.getColumn("A").width = 18;
  refWs.getColumn("B").width = 25;
  refWs.getColumn("C").width = 15;
  refWs.getColumn("D").width = 15;
  refWs.getColumn("E").width = 16;
  refWs.getColumn("F").width = 16;
  refWs.getColumn("G").width = 40;
  refWs.getColumn("H").width = 4;
  refWs.getColumn("I").width = 18;
  refWs.getColumn("J").width = 25;
  refWs.getColumn("K").width = 16;
  refWs.getColumn("L").width = 32;
  refWs.getColumn("M").width = 4;
  refWs.getColumn("N").width = 14;
  refWs.getColumn("O").width = 24;

  // 3. Terapkan Data Validation (Dropdown / Ketik dan Pilih) pada Sheet TemplateSantri
  const maxRows = 500;
  for (let r = 2; r <= maxRows; r++) {
    // Format WhatsApp & Kamar sebagai teks (@)
    ws.getCell(`B${r}`).numFmt = "@";
    const kamarCell = ws.getCell(`G${r}`);
    kamarCell.numFmt = "@";

    // Auto-fill rumus jika rute C diisi (untuk baris 4 ke atas yang belum punya nilai)
    if (r > 3) {
      ws.getCell(`D${r}`).value = {
        formula: `IF(C${r}="","",TRIM(MID(SUBSTITUTE(C${r},">",REPT(" ",100)),1,100)))`,
        result: undefined,
      };
      ws.getCell(`E${r}`).value = {
        formula: `IF(C${r}="","",TRIM(MID(SUBSTITUTE(C${r},">",REPT(" ",100)),101,100)))`,
        result: undefined,
      };
      ws.getCell(`F${r}`).value = {
        formula: `IF(C${r}="","",TRIM(MID(SUBSTITUTE(C${r},">",REPT(" ",100)),201,100)))`,
        result: undefined,
      };
    }

    // Dropdown RUTE HIERARKI (Kolom C) -> Memuat rute valid Blok > Asrama > Kode
    ws.getCell(`C${r}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`Referensi_Enum!$G$2:$G$${routes.length + 1}`],
      showErrorMessage: true,
      errorStyle: "warning",
      errorTitle: "Rute Penempatan Kamar Tidak Valid",
      error: "Silakan pilih salah satu rute hierarki (Blok > Asrama > Kode) dari daftar opsi yang tersedia.",
    };

    // Dropdown Blok (Kolom D)
    ws.getCell(`D${r}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`Referensi_Enum!$A$2:$A$${bloks.length + 1}`],
      showErrorMessage: true,
      errorStyle: "warning",
      errorTitle: "Pilihan Blok Tidak Valid",
      error: "Silakan ketik atau pilih nama Blok dari daftar opsi yang tersedia.",
    };

    // Dropdown Asrama (Kolom E)
    ws.getCell(`E${r}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`Referensi_Enum!$B$2:$B$${asramas.length + 1}`],
      showErrorMessage: true,
      errorStyle: "warning",
      errorTitle: "Pilihan Asrama Tidak Valid",
      error: "Silakan ketik atau pilih nama Asrama dari daftar opsi yang tersedia.",
    };

    // Dropdown Kode (Kolom F)
    ws.getCell(`F${r}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`Referensi_Enum!$C$2:$C$${kodes.length + 1}`],
      showErrorMessage: true,
      errorStyle: "warning",
      errorTitle: "Pilihan Kode Tidak Valid",
      error: "Silakan ketik atau pilih Kode kamar dari daftar opsi yang tersedia.",
    };

    // Dropdown Kamar (Kolom G)
    kamarCell.dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`Referensi_Enum!$D$2:$D$${kamars.length + 1}`],
      showErrorMessage: true,
      errorStyle: "warning",
      errorTitle: "Pilihan Kamar Tidak Valid",
      error: "Silakan ketik atau pilih Nomor Kamar dari daftar opsi yang tersedia.",
    };

    // Dropdown Halaqoh Kelas (Kolom H)
    ws.getCell(`H${r}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`Referensi_Enum!$E$2:$E$${kelasList.length + 1}`],
      showErrorMessage: true,
      errorStyle: "warning",
      errorTitle: "Pilihan Kelas Tidak Valid",
      error: "Silakan pilih Kelas antara 1 sampai 10.",
    };

    // Dropdown Halaqoh Bagian (Kolom I)
    ws.getCell(`I${r}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`Referensi_Enum!$F$2:$F$${bagianList.length + 1}`],
      showErrorMessage: true,
      errorStyle: "warning",
      errorTitle: "Pilihan Bagian Tidak Valid",
      error: "Silakan pilih Bagian (A, B, C, dst.) dari opsi yang tersedia.",
    };
  }

  // 4. Ekspor dan Unduh Berkas .xlsx di Browser
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const downloadLink = document.createElement("a");
  downloadLink.href = url;
  downloadLink.download = "Template_Import_Santri_LPTQ_Blokagung.xlsx";
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  URL.revokeObjectURL(url);
}

export function downloadKhotmilTemplateExcel() {
  const sampleRows = [
    {
      Kode: "S-1001",
      Jenis: "khotmil15",
      Tahap: 1,
      Juz: 1,
      Nilai: 88,
    },
    {
      Kode: "S-1001",
      Jenis: "khotmil15",
      Tahap: 1,
      Juz: 2,
      Nilai: 90,
    },
  ];
  exportJsonToExcel(sampleRows, "Template_Import_Khotmil_LPTQ_Blokagung", "TemplateKhotmil");
}

export async function parseExcelFileWithValidation(
  file: File,
  requiredHeaders: string[]
): Promise<Record<string, unknown>[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error("Berkas Excel tidak memiliki lembar kerja (sheet).");
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: "",
  });

  if (jsonRows.length === 0) {
    throw new Error("Berkas Excel kosong atau tidak memiliki baris data.");
  }

  const actualHeaders = Object.keys(jsonRows[0]).map((h) => h.trim());
  const missingHeaders = requiredHeaders.filter((req) => !actualHeaders.includes(req));

  if (missingHeaders.length > 0) {
    throw new Error(
      `Header kolom wajib tidak ditemukan: ${missingHeaders.join(", ")}. Unduh template terlebih dahulu.`
    );
  }

  return jsonRows;
}

export function toLocalIsoDate(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
