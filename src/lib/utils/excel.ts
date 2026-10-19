import * as XLSX from "xlsx";

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

export function downloadSantriTemplateExcel() {
  const sampleRows = [
    {
      "Nama Lengkap": "Ahmad Fauzi Darussalam",
      Blok: "A",
      Asrama: "Al-Falah",
      Kode: "S-2001",
      Kamar: "A1",
      "Halaqoh Kelas": 1,
      "Halaqoh Bagian": "A",
    },
    {
      "Nama Lengkap": "Muhammad Rizky Pratama",
      Blok: "B",
      Asrama: "An-Nur",
      Kode: "S-2002",
      Kamar: "B2",
      "Halaqoh Kelas": 2,
      "Halaqoh Bagian": "B",
    },
  ];
  exportJsonToExcel(sampleRows, "Template_Import_Santri_LPTQ_Blokagung", "TemplateSantri");
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
